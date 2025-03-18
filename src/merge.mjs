//@ts-check
export const OPS = {
  ADD: "+",
  REMOVE: "-",
  KEEP: "|",
}

export function diff(oldValue, newValue) {
  let oldValueLines = oldValue.split("\n");
  let newValueLines = newValue.split("\n");
  let newPos = 0;
  let res = []
  for (let line of oldValueLines) {
    let pos = newValueLines.indexOf(line, newPos);
    if (pos === -1) {
      res.push({ op: OPS.REMOVE, value: line });
    } else {
      if (pos - newPos > 0) {
        for (let i = newPos; i < pos; i++) {
          res.push({ op: OPS.ADD, value: newValueLines[i] });
        }
      }
      res.push({ op: OPS.KEEP, value: newValueLines[pos] });
      newPos = pos + 1;
    }
  }
  if (newPos < newValueLines.length) {
    for (let i = newPos; i < newValueLines.length; i++) {
      res.push({ op: OPS.ADD, value: newValueLines[i] })
    }
  }
  return res;
}

export function diffToString(diff, add = "+ ", remove = "- ", keep = "| ") {
  let map = {
    [OPS.ADD]: add,
    [OPS.REMOVE]: remove,
    [OPS.KEEP]: keep
  }
  return diff.map(({ op, value }) => `${map[op]}${value}`).join("\n");
}

function addToDiffBlock(state, value) {
  if (state.block.values.length) {
    let isKeepValue = value.op === OPS.KEEP;
    if (state.block.isKeep !== isKeepValue) {
      state.block.end = state.linePos;
      state.block.endChar = state.charPos;
      state.res.push(state.block);
      state.block = { values: [] };
    }
  }
  if (!state.block.values.length) {
    state.block.isKeep = value.op === OPS.KEEP;
    state.block.start = state.linePos;
    state.block.startChar = state.charPos;
  }
  state.block.values.push(value);
}

export function diffBlocks(oldValue, newValue) {
  let oldValueLines = oldValue.split("\n");
  let newValueLines = newValue.split("\n");
  let newPos = 0;
  let state = {
    linePos: 0,
    charPos: 0,
    res: [],
    block: { values: [] },
  }
  while (state.linePos < oldValueLines.length) {
    let line = oldValueLines[state.linePos]
    let pos = newValueLines.indexOf(line, newPos);
    if (pos === -1) {
      addToDiffBlock(state, { op: OPS.REMOVE, value: line });
      //TODO Possibly handle here when the newValue is already finished
    } else {
      if (pos - newPos > 0) {
        for (let i = newPos; i < pos; i++) {
          addToDiffBlock(state, { op: OPS.ADD, value: newValueLines[i] });
        }
      }
      addToDiffBlock(state, { op: OPS.KEEP, value: newValueLines[pos] });
      newPos = pos + 1;
    }
    state.linePos++
    state.charPos += line.length + 1;
  }
  if (newPos < newValueLines.length) {
    for (let i = newPos; i < newValueLines.length; i++) {
      addToDiffBlock(state, { op: OPS.ADD, value: newValueLines[i] })
    }
  }

  if (state.block.values.length) {
    state.block.end = state.linePos;
    state.block.endChar = state.charPos;
    state.res.push(state.block);
  }
  return state.res;
}

export function blockSize(block) {
  return block.lines.reduce((sum, line) => sum + line.length, block.lines.length - 1);
}

function addToPatchBlock(state, value) {
  if (!state.block.isNew) {
    let isKeepValue = value.op === OPS.KEEP;
    if (state.block.isKeep !== isKeepValue) {
      if (!state.block.isKeep) {
        state.res.push({
          lines: state.block.values,
          start: state.block.start,
          startChar: state.block.startChar,
          end: state.linePos,
          endChar: state.charPos,
          // size: blockSize(state.block.values)
        });
      }
      state.block = { isNew: true, values: [] };
    }
  }
  if (state.block.isNew) {
    state.block.isNew = false;
    state.block.isKeep = value.op === OPS.KEEP;
    state.block.start = state.linePos;
    state.block.startChar = state.charPos;
  }
  if (value.op === OPS.ADD) {
    state.block.values.push(value.value);
  }
}

function patchBlocks(oldValue, newValue) {
  let newPos = 0;
  let state = {
    linePos: 0,
    charPos: 0,
    res: [],
    block: { isNew: true, values: [] },
  }
  while (state.linePos < oldValue.length) {
    let line = oldValue[state.linePos]
    let pos = newValue.indexOf(line, newPos);
    if (pos === -1) {
      addToPatchBlock(state, { op: OPS.REMOVE, value: line });
      //TODO Possibly handle here when the newValue is already finished
    } else {
      if (pos - newPos > 0) {
        for (let i = newPos; i < pos; i++) {
          addToPatchBlock(state, { op: OPS.ADD, value: newValue[i] });
        }
      }
      addToPatchBlock(state, { op: OPS.KEEP, value: newValue[pos] });
      newPos = pos + 1;
    }
    state.linePos++;
    state.charPos += line.length + 1;
  }
  if (newPos < newValue.length) {
    for (let i = newPos; i < newValue.length; i++) {
      addToPatchBlock(state, { op: OPS.ADD, value: newValue[i] })
    }
  }

  if (state.block.values.length && !state.block.isKeep) {
    state.res.push({
      lines: state.block.values,
      start: state.block.start,
      startChar: state.block.startChar,
      end: state.linePos,
      endChar: state.charPos-1,
      // size: blockSize(state.block.values)
    });
  }
  return state.res;
}

export function patch(base, changes) {
  return patchBlocks(base.split("\n"), changes.split("\n"));
}

function flat(list, res = []) {
  for (let entry of list) {
    if (entry instanceof Array) {
      flat(entry, res);
    } else {
      res.push(entry);
    }
  }
  return res;
}

function addConflitLines(isLocal, conflit) {
  if (isLocal) {
    conflit.unshift(">>>>>LOCAL-CHANGES>>>>>");
  } else {
    conflit.unshift("<<<<<SERVER-CHANGES<<<<<");
  }
  conflit.push("========================");
}

export function merge(base, server, local) {
  let baseLines = base.split("\n");
  let localLines = local.split("\n");
  let serverLines = server.split("\n");

  let localPatch = patchBlocks(baseLines, localLines);
  let serverPatch = patchBlocks(baseLines, serverLines);

  let res = [];
  let basePos = 0;
  let localPatchPos = 0;
  let serverPatchPos = 0;

  while (localPatchPos < localPatch.length && serverPatchPos < serverPatch.length) {
    let blockA = { isLocal: true, ...localPatch[localPatchPos] };
    let blockB = { isLocal: false, ...serverPatch[serverPatchPos] };
    //BlockA is always the first to start
    if (blockB.start < blockA.start) {
      let aux = blockA;
      blockA = blockB;
      blockB = aux;
    }

    // Adds any extra base part before the block A
    if (blockA.start > basePos) {
      res.push(baseLines.slice(basePos, blockA.start));
    }
    basePos = blockA.start;

    //No intersection
    if (blockA.end <= blockB.start) {
      // Adds block A
      res.push(blockA.lines)
      // sets the base position to after block A
      basePos = blockA.end;
      //moves the respective stack of block A
      if (blockA.isLocal) {
        localPatchPos++;
      } else {
        serverPatchPos++;
      }
    } else if (blockA.start === blockB.start) {// Note: we already know that inside this 'if' the local is block A because A starts as the local one and only switches if the server one has a lower start
      let blockPos = 0;
      while (blockPos < blockA.lines.length && blockPos < blockB.lines.length) {
        if (blockA.lines[blockPos] !== blockB.lines[blockPos]) {
          break;
        }
        blockPos++;
      }

      if (blockPos < blockB.lines.length) {// Server didn't finished, there is a conflit
        let blockAConflit = [];
        let blockBConflit = [];

        //Adds common part between blocks
        if (blockPos) {
          res.push(blockA.lines.slice(0, blockPos));
        }

        //Adds the remaining part of each to their respective conflit blocks
        blockAConflit.push(blockA.lines.slice(blockPos))
        blockBConflit.push(blockB.lines.slice(blockPos))

        //Adds extra base part to the conflit of the smaller block if needed
        if (blockA.end < blockB.end) {
          blockAConflit.push(baseLines.slice(blockA.end, blockB.end));
          basePos = blockB.end;
        } else if (blockB.end < blockA.end) {
          blockBConflit.push(baseLines.slice(blockB.end, blockA.end));
          basePos = blockA.end;
        } else {
          basePos = blockA.end;
        }
        addConflitLines(false, blockBConflit);
        addConflitLines(true, blockAConflit);

        res.push(blockBConflit);
        res.push(blockAConflit);
      } else {// Server finished, merge is ok, add local incase local has extra data compared to server
        res.push(blockA.lines);
        basePos = blockA.end;
      }

      //moves both the stacks
      localPatchPos++;
      serverPatchPos++;
    } else {// has intersection with conflit
      let aEndsBeforeB = blockA.end < blockB.end;

      let blockAConflit = [];
      blockAConflit.push(blockA.lines);
      if (aEndsBeforeB) {
        blockAConflit.push(baseLines.slice(blockA.end, blockB.end));
      }
      addConflitLines(blockA.isLocal, blockAConflit);

      let blockBConflit = [];
      // Adds any extra base part between the block A start and block B start
      if (blockB.start > blockA.start) {
        blockBConflit.push(baseLines.slice(blockA.start, blockB.start));
      }
      blockBConflit.push(blockB.lines);
      // Adds any extra base part between the block B end and block A end
      if (blockB.end < blockA.end) {
        blockBConflit.push(baseLines.slice(blockB.end, blockA.end));
      }
      addConflitLines(blockB.isLocal, blockBConflit);

      //adds both confilct blocks with the server one on the top
      if (blockA.isLocal) {
        res.push(blockBConflit);
        res.push(blockAConflit);
      } else {
        res.push(blockAConflit);
        res.push(blockBConflit);
      }

      basePos = aEndsBeforeB ? blockB.end : blockA.end;
      //moves both the stacks
      localPatchPos++;
      serverPatchPos++;
    }
  }

  while (localPatchPos < localPatch.length) {
    let block = localPatch[localPatchPos];
    if (block.start > basePos) {
      res.push(baseLines.slice(basePos, block.start));
    }
    res.push(block.lines)
    basePos = block.end;
    localPatchPos++
  }

  while (serverPatchPos < serverPatch.length) {
    let block = serverPatch[serverPatchPos];
    if (block.start > basePos) {
      res.push(baseLines.slice(basePos, block.start));
    }
    res.push(block.lines)
    basePos = block.end;
    serverPatchPos++
  }

  if (baseLines.length > basePos) {
    res.push(baseLines.slice(basePos));
  }

  return flat(res).join("\n");
}
