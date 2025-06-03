//@ts-check


/** @typedef {"String"|"Number"|"Integer"|"List"|"Bool"|"Flag"} OptionType */
/** @typedef {{type?:OptionType,min?:number,max?:number,alias?:string|string[],defaultValue?:any,seperator?:string,description?:string}} Option */
/** @typedef {{option:string,value:any,alias?:string|string[],description?:string}} Mapping */

/** @typedef {{[key:string]:OptionType|Option}} OptionMap */
/** @typedef {{[key:string]:Mapping}} MappingMap */

/** @typedef {{options?:OptionMap,mappings?:MappingMap,caseSensitive?:boolean,prefix?:string,multiPrefix?:string,setter?:string,argList?:string,hifenToCamel?:boolean,autoHelp?:boolean,autoSingleChar?:boolean}} CliConfig */


/** @typedef {{name:string,description:string}} BaseOption */
/** @typedef {BaseOption & {min:number|null,max:number|null}} SizedOption */

/** @typedef {SizedOption & {type:"List",seperator:string}} ListOption */
/** @typedef {SizedOption & {type:"Number"|"Integer"|"String"}} SizeOnlyOption */
/** @typedef {BaseOption & {type:"Bool"|"Flag"}} SimpleOption */
/** @typedef {BaseOption & {type:"Mapping",option:string,value:any}} MappingOption */
/** @typedef {ListOption|SizeOnlyOption|SimpleOption|MappingOption} ProcessedOption */

/** @typedef  {{[key:string]:ProcessedOption}} ProcessedOptionMap */


/** @typedef {{options:ProcessedOptionMap,caseSensitive:boolean,prefix:string,multiPrefix:string,setter:string|null,argList:string,hifenToCamel:boolean,baseResult:{[key:string]:any}}} CompiledCliConfig */


/**
 * 
 * @param {OptionType|"Mapping"} type 
 * @param {number|null} min 
 * @param {number|null} max 
 * @param {string} seperator 
 */
function generateInputExample(type, min, max, seperator) {
  switch (type) {
    case "String":
      return ' "value"'
    case "Number":
      return ' <12.3>'
    case "Integer":
      return ' <123>'
    case "List":
      return ` "${["val1", "val2", "..."].join(seperator)}`
    case "Bool":
      return " <true|false>"
    case "Flag":
    case "Mapping":
      return ""
  }
}

/**
 * 
 * @param {string} prefix 
 * @param {string} multiPrefix 
 * @param {string[]} alias 
 * @param {string|undefined} description
 * @param {OptionType|"Mapping"} type 
 * @param {number|null} min 
 * @param {number|null} max 
 * @param {string} seperator 
 */
function generateDescription(prefix, multiPrefix, alias, description, type, min, max, seperator) {
  return `${alias.map(a => (a.length === 1 && (type == "Flag" || type == "Mapping") ? multiPrefix : prefix) + a).join(" ")}${generateInputExample(type, min, max, seperator)}${typeof description === "string" ? " -> " + description : ""}`;//"TODO description with given text,type aliases and default value";
}

/**
 * 
 * @param {CliConfig} config
 * @returns {CompiledCliConfig}
 */
export function compileCliOptions({ options = {}, mappings = {}, caseSensitive = true, prefix = "--", multiPrefix = "-", setter = "=", argList = "_args", hifenToCamel = false, autoHelp = true, autoSingleChar = false } = {}) {
  if (prefix == multiPrefix) {
    throw new Error(`Prefix and MultiPrefix are the same.`)
  }
  const baseResult = {};

  /** @type {ProcessedOptionMap} */
  const processedOptionMap = {}

  for (let [name, opc] of Object.entries(options)) {
    /** @type {Option} */
    const val = typeof opc === "string" ? { type: opc } : opc;

    const type = val.type ? val.type : "String"

    let alias = val.alias ? val.alias instanceof Array ? [name, ...val.alias] : [name, val.alias] : [name]
    if (!caseSensitive) {
      alias = alias.map(a => a.toLocaleLowerCase())
      name = alias[0];
    }
    const seperator = typeof val.seperator === "string" ? val.seperator : ",";
    const min = typeof val.min === "number" ? val.min : null;
    const max = typeof val.max === "number" ? val.max : null;
    if (min !== null && max !== null && max > min) {
      throw new Error(`Error parsing '${name}' option: Minimum is greated than the Maximum`)
    }
    //TODO consider adding the default value in the description
    const description = generateDescription(prefix, multiPrefix, alias, val.description, type, min, max, seperator);//"TODO description with given text,type aliases and default value";

    /** @type {ProcessedOption} */
    let processedOption
    switch (type) {
      case "String":
      case "Number":
      case "Integer":
        processedOption = { name, type, min, max, description };
        break;
      case "List":
        processedOption = { name, type, min, max, description, seperator };
        break;
      case "Bool":
      case "Flag":
        processedOption = { name, type, description };
        break;
    }

    for (let a of alias) {
      if (processedOptionMap[a]) {
        throw new Error(`'${a}' is already used by option/mapping '${processedOptionMap[a].name}'`)
      } else {
        processedOptionMap[a] = processedOption;
      }
    }
    //Sets the initial value for the option
    baseResult[name] = type === "Flag" ? false : val.defaultValue !== undefined ? val.defaultValue : null
  }

  //process the mappings here
  for (let [name, mapping] of Object.entries(mappings)) {
    let alias = mapping.alias ? mapping.alias instanceof Array ? [name, ...mapping.alias] : [name, mapping.alias] : [name]
    if (!caseSensitive) {
      alias = alias.map(a => a.toLocaleLowerCase())
      name = alias[0];
    }
    const description = generateDescription(prefix, multiPrefix, alias, mapping.description, "Mapping", null, null, "");
    const option = caseSensitive ? mapping.option : mapping.option.toLocaleLowerCase();

    if (!Object.hasOwn(baseResult, option)) {
      baseResult[option] = null
    }

    /** @type {MappingOption} */
    let processedOption = { name, type: "Mapping", option, description, value: mapping.value };
    for (let a of alias) {
      if (processedOptionMap[a]) {
        throw new Error(`'${a}' is already used by option/mapping '${processedOptionMap[a].name}'`)
      } else {
        processedOptionMap[a] = processedOption;
      }
    }
  }

  //Checks if there isn't any imcompatibility between the argsList and any options
  if (Object.hasOwn(baseResult, argList)) {
    throw new Error(`The given argsList value '${argList}' is used by an option/mapping already.`)
  } else {
    baseResult[argList] = [];
  }

  return { options: processedOptionMap, caseSensitive, prefix, multiPrefix, setter, hifenToCamel, baseResult, argList }
}

/**
 * 
 * @param {CompiledCliConfig} config
 * @param {string[]} args
 */
export function processCliArguments(config, args) {
  let result = structuredClone(config.baseResult)
  args = structuredClone(args);
  while (args.length) {
    let curr = args.shift();
    let isPrefix = curr.startsWith(config.prefix);
    let isMultiPrefix = curr.startsWith(config.multiPrefix);

    //if both prefixes match it means that one of them is the extension of the other
    //consideering that, on those cases only the longer one will be treated as matching
    if (isPrefix && isMultiPrefix) {
      if (config.prefix.length > config.multiPrefix.length) {
        isMultiPrefix = false;
      } else {
        isPrefix = false;
      }
    }

    if (isPrefix) {
      let value;
      curr = curr.slice(config.prefix.length);
      const setterPos = config.setter ? curr.indexOf(config.setter) : -1;

      //is the setter format
      if (setterPos !== -1) {
        value = curr.slice(setterPos + config.setter.length);
        curr = curr.slice(0, setterPos);
      }

      if (!config.caseSensitive) {
        curr = curr.toLocaleLowerCase();
      }

      if (config.options[curr]) {
        //in processing check if is flag/mapping or another
        // if flag mapping check that the values wasnt set, if it was fail because you can't set a flag/mapping value, if not process is as expected for the flag or mapping
        // for the other types if the value hasnt been set, check that one exists oin the args and set it as the value to process, else throw an error
        // after that if a value exist just proces it depending on the type and do the necessary checks
        const opc = config.options[curr];
        if (opc.type === "Flag" || opc.type === "Mapping") {
          if (value !== undefined) {
            throw new Error(`${config.prefix}${curr} is a ${opc.type} option meaning it can't have a value set to it by using ${config.setter}.`);
          }
          if (opc.type == "Flag") {
            result[opc.name] = true;
          } else {
            result[opc.option] = opc.value;
          }
        } else {
          if (value === undefined) {
            if (args.length) {
              value = args.shift();
            } else {
              throw new Error(`No value given for ${config.prefix}${curr}`);
            }
          }

          switch (opc.type) {
            case "String":
              if (opc.min !== null) {
                if (value.length < opc.min) {
                  throw new Error(`${config.prefix}${curr} value must be at least ${opc.min} characters long.`);
                }
              }
              if (opc.max !== null) {
                if (value.length < opc.max) {
                  throw new Error(`${config.prefix}${curr} value must not be over ${opc.max} characters long.`);
                }
              }
              break;
            case "Number":
              value = Number(value);
              if (Number.isNaN(value)) {
                throw new Error(`${config.prefix}${curr} value must be a number.`);
              }
              if (opc.min !== null) {
                if (value < opc.min) {
                  throw new Error(`${config.prefix}${curr} value must be at least ${opc.min}.`);
                }
              }
              if (opc.max !== null) {
                if (value < opc.max) {
                  throw new Error(`${config.prefix}${curr} value must not be over ${opc.max}.`);
                }
              }
              break;
            case "Integer":
              value = Number(value);
              if (Number.isNaN(value) || Math.trunc(value) !== value) {
                throw new Error(`${config.prefix}${curr} value must be an integer.`);
              }
              if (opc.min !== null) {
                if (value < opc.min) {
                  throw new Error(`${config.prefix}${curr} value must be at least ${opc.min}.`);
                }
              }
              if (opc.max !== null) {
                if (value < opc.max) {
                  throw new Error(`${config.prefix}${curr} value must not be over ${opc.max}.`);
                }
              }
              break;
            case "List":
              value = value.split(opc.seperator);
              if (opc.min !== null) {
                if (value.length < opc.min) {
                  throw new Error(`${config.prefix}${curr} list must have at least ${opc.min} values.`);
                }
              }
              if (opc.max !== null) {
                if (value.length < opc.max) {
                  throw new Error(`${config.prefix}${curr} list must not hvae over ${opc.max} values.`);
                }
              }
              break;
            case "Bool":
              value = value.toLocaleLowerCase();
              value = value === "true" || value === "yes" || value === "y" || (!Number.isNaN(Number(value)) && Number(value) !== 0)//any non zero number will be considered as a true value
              break;
          }

          result[opc.name] = value;
        }
      } else {
        throw new Error(`${config.prefix}${curr} is not a valid option.`)
      }

    } else if (isMultiPrefix) {
      curr = curr.slice(config.multiPrefix.length);

      if (!config.caseSensitive) {
        curr = curr.toLocaleLowerCase();
      }
      for (const c of curr) {
        if (config.options[c]) {

          const opc = config.options[c];

          if (opc.type == "Flag") {
            result[opc.name] = true;
          } else if (opc.type == "Mapping") {
            result[opc.option] = opc.value;
          } else {
            throw new Error(`${config.multiPrefix}${c} is not a Flag or Mapping option.`)
          }
        } else {
          throw new Error(`${config.multiPrefix}${c} is not a valid option.`)
        }

      }
    } else {
      result[config.argList].push(curr);
    }
  }
  return result;
}


/**
 * 
 * @param {CliConfig} config
 */
export function parseCliArgs(config = {}) {
  let args = process.argv.slice(2);
  const compiledConfig = compileCliOptions(config);

  console.dir(compiledConfig, { depth: 5 })

  const result = processCliArguments(compiledConfig, args);
  //check and process the actual args
  console.log(result)
}


/**
 * setter string that defines the value of the option, e.g. setter '='  --test=123 would convert to {test:"123"} 
 * most values are initialized to null, except the Flag type, that is set to false
 * argList is the name of the parameter that stores all non option arguments
 * 
 * have a parameter to fail on non option args or make it so that is defined by the setting or not of the argList parameter
 * 
 * maybe remove the description from the option themselves and just create a single help text, change the auto help to simply define the help option, or just completly ignore it and just make it get from the result and show it if the flag is true
 * TODO add flag to show help on processError
 */
