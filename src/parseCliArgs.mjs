//@ts-check


/** @typedef {"String"|"Number"|"Integer"|"Value"|"List"|"NumberList"|"IntegerList"|"ValueList"|"Bool"|"Flag"} OptionType */
/** @typedef {{lessOrEqual?:number,lessEqual?:number,lte?:number,less?:number,lt?:number,greaterOrEqual?:number,greaterEqual?:number,gte?:number,greater?:number,gt?:number}} Limits */
/** @typedef {{type?:OptionType,alias?:string|string[],defaultValue?:any,seperator?:string,description?:string,values?:string[],valueLimits?:Limits}&Limits} Option */
/** @typedef {{option:string,value:any,alias?:string|string[],description?:string}} Mapping */

/** @typedef {{[key:string]:OptionType|Option}} OptionMap */
/** @typedef {{[key:string]:Mapping}} MappingMap */

/** @typedef {{options?:OptionMap,mappings?:MappingMap,caseSensitive?:boolean,prefix?:string,multiPrefix?:string,setter?:string,argList?:string,hifenToCamel?:boolean,autoHelp?:boolean,autoSingleChar?:boolean}} CliConfig */

/** @typedef {{lessOrEqual:number|null,less:number|null,greaterOrEqual:number|null,greater:number|null}} CompiledLimits */

/** @typedef {{name:string}} BaseOption */
/** @typedef {BaseOption & CompiledLimits} SizedOption */
/** @typedef {SizedOption & {seperator:string}} ListOption */
/** @typedef {ListOption & {type:"List"|"NumberList"|"IntegerList",valueLimits:CompiledLimits}} SizedListOption */
/** @typedef {ListOption & {type:"ValueList",values:string[]}} ValueListOption */
/** @typedef {SizedOption & {type:"Number"|"Integer"|"String"}} SizeOnlyOption */
/** @typedef {BaseOption & {type:"Bool"|"Flag"|"Help"}} SimpleOption */
/** @typedef {BaseOption & {type:"Value",values:string[]}} ValueOption */
/** @typedef {BaseOption & {type:"Mapping",option:string,value:any}} MappingOption */
/** @typedef {SizedListOption|ValueListOption|SizeOnlyOption|SimpleOption|ValueOption|MappingOption} ProcessedOption */

/** @typedef  {{[key:string]:ProcessedOption}} ProcessedOptionMap */


/** @typedef {{options:ProcessedOptionMap,caseSensitive:boolean,prefix:string,multiPrefix:string,setter:string|null,argList:string,hifenToCamel:boolean,baseResult:{[key:string]:any},helpText:string}} CompiledCliConfig */


/**
 * 
 * @param {OptionType|"Mapping"} type 
 * @param {CompiledLimits} limits  
 * @param {string} seperator 
 * @param {any} [defaultValue] 
 */
function generateInputExample(type, limits, seperator, defaultValue) {
  //TODO add the contraints into the list values
  let constraints = []
  if (limits.greaterOrEqual !== null) {
    constraints.push(`greaterOrEqual:${limits.greaterOrEqual}`)
  } else if (limits.greater !== null) {
    constraints.push(`greater:${limits.greater}`)
  }
  if (limits.lessOrEqual !== null) {
    constraints.push(`lessOrEqual:${limits.lessOrEqual}`)
  } else if (limits.less !== null) {
    constraints.push(`less:${limits.less}`)
  }
  if (defaultValue !== undefined) {
    constraints.push(`default:${JSON.stringify(defaultValue)}`)
  }
  const suffix = constraints.length ? ` {${constraints.join(",")}}` : ""
  //TODO add Value and ValueList types
  //TODO review and improve example generation
  switch (type) {
    case "String":
      return ` <String>${suffix}`
    case "Number":
      return ` <Number>${suffix}`
    case "Integer":
      return ` <Integer>${suffix}`
    case "List":
    case "NumberList":
    case "IntegerList":
      return ` <${["val1", "val2", "..."].join(seperator)}>${suffix}`
    case "Bool":
      return " <true|false>"
    case "Flag":
    case "Mapping":
      return ""
    default:
      return `||${type}||`
  }
}

/**
 * 
 * @param {string} prefix 
 * @param {string} multiPrefix 
 * @param {string[]} alias 
 * @param {string|undefined} description
 * @param {OptionType|"Mapping"} type 
 * @param {CompiledLimits} limits
 * @param {string} seperator 
 * @param {any} [defaultValue] 
 */
function generateDescription(prefix, multiPrefix, alias, description, type, limits, seperator, defaultValue) {
  return `${alias.map(a => (a.length === 1 && (type == "Flag" || type == "Mapping") ? multiPrefix : prefix) + a).join(" ")}${generateInputExample(type, limits, seperator, defaultValue)}${typeof description === "string" ? "\t" + description : ""}`;
}

/**
 * 
 * @param {Limits} [obj] 
 * @param {string} [obj] 
 * @returns {CompiledLimits}
 */
function compileLimits(obj, errorPrefix = "") {
  /** @type {CompiledLimits} */
  const result = { greaterOrEqual: null, greater: null, lessOrEqual: null, less: null };
  if (obj) {
    if (typeof obj.greaterOrEqual == "number") {
      result.greaterOrEqual = obj.greaterOrEqual;
    } else if (typeof obj.greaterEqual == "number") {
      result.greaterOrEqual = obj.greaterEqual;
    } else if (typeof obj.gte == "number") {
      result.greaterOrEqual = obj.gte;
    } else if (typeof obj.greater == "number") {
      result.greater = obj.greater;
    } else if (typeof obj.gt == "number") {
      result.greater = obj.gt;
    }

    if (typeof obj.lessOrEqual == "number") {
      result.lessOrEqual = obj.lessOrEqual;
    } else if (typeof obj.lessEqual == "number") {
      result.lessOrEqual = obj.lessEqual;
    } else if (typeof obj.lte == "number") {
      result.lessOrEqual = obj.lte;
    } else if (typeof obj.less == "number") {
      result.less = obj.less;
    } else if (typeof obj.lt == "number") {
      result.less = obj.lt;
    }

    if (result.greaterOrEqual !== null) {
      if (result.lessOrEqual !== null && result.greaterOrEqual > result.lessOrEqual) {
        throw new Error(`${errorPrefix}greaterOrEqual(${result.greaterOrEqual}) > lessOrEqual(${result.lessOrEqual})`)
      } else if (result.less !== null && result.greaterOrEqual >= result.less) {
        throw new Error(`${errorPrefix}greaterOrEqual(${result.greaterOrEqual}) >= less(${result.less})`)
      }
    } else if (result.greater !== null) {
      if (result.lessOrEqual !== null && result.greater >= result.lessOrEqual) {
        throw new Error(`${errorPrefix}greater(${result.greater}) >= lessOrEqual(${result.lessOrEqual})`)
      } else if (result.less !== null && result.greater >= result.less) {
        throw new Error(`${errorPrefix}greater(${result.greater}) >= less(${result.less})`)
      }
    }
  }
  return result;
}

/**
 * 
 * @param {CliConfig} config
 * @returns {CompiledCliConfig}
 */
export function compileCliOptions({ options = {}, mappings = {}, caseSensitive = true, prefix = "--", multiPrefix = "-", setter = "=", argList = "_args", hifenToCamel = false, autoHelp = true, autoSingleChar = false } = {}) {
  const helpText = ["Available Options:\n"]
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
    const limits = compileLimits(val, `Error parsing '${name}' option limits: `);
    const valueLimits = compileLimits(val.valueLimits, `Error parsing '${name}' option value limits: `);

    const description = generateDescription(prefix, multiPrefix, alias, val.description, type, limits, seperator, val.defaultValue);

    const values = val.values instanceof Array ? [...new Set(val.values)] : [];

    helpText.push(description);

    /** @type {ProcessedOption} */
    let processedOption
    switch (type) {
      case "String":
      case "Number":
      case "Integer":
        processedOption = { name, type, ...limits };
        break;
      case "Value":
        if (!values.length) {
          throw new Error(`Error parsing '${name}' option: empty or invalid 'values' list given.`)
        }
        processedOption = { name, type, values };
        break;
      case "List":
      case "NumberList":
      case "IntegerList":
        processedOption = { name, type, seperator, ...limits, valueLimits };
        break;
      case "ValueList":
        if (!values.length) {
          throw new Error(`Error parsing '${name}' option: empty or invalid 'values' list given.`)
        }
        processedOption = { name, type, seperator, ...limits, values };
        break;
      case "Bool":
      case "Flag":
        processedOption = { name, type };
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
    const description = generateDescription(prefix, multiPrefix, alias, mapping.description, "Mapping", compileLimits(), "");
    const option = caseSensitive ? mapping.option : mapping.option.toLocaleLowerCase();

    helpText.push(description);

    if (!Object.hasOwn(baseResult, option)) {
      baseResult[option] = null
    }

    /** @type {MappingOption} */
    let processedOption = { name, type: "Mapping", option, value: mapping.value };
    for (let a of alias) {
      if (processedOptionMap[a]) {
        throw new Error(`'${a}' is already used by option/mapping '${processedOptionMap[a].name}'`)
      } else {
        processedOptionMap[a] = processedOption;
      }
    }
  }

  //Checks if there isn't any incompatibility between the argsList and any options
  if (Object.hasOwn(baseResult, argList)) {
    throw new Error(`The given argsList value '${argList}' is used by an option/mapping already.`)
  } else {
    baseResult[argList] = [];
  }

  return { options: processedOptionMap, caseSensitive, prefix, multiPrefix, setter, hifenToCamel, baseResult, argList, helpText: helpText.join("\n\n") }
}

/**
 * 
 * @param {CompiledCliConfig} config
 */
function showHelp(config) {
  console.log(config.helpText)
  process.exit(0);
}

/**
 * 
 * @param {number} value 
 * @param {CompiledLimits} limits 
 * @param {string} limits 
 */
function validateLimits(value, limits, errorPrefix, errorSuffix) {
  if (limits.greaterOrEqual !== null) {
    if (value < limits.greaterOrEqual) {
      throw new Error(`${errorPrefix}must be at least ${limits.greaterOrEqual}${errorSuffix}`);
    }
  } else if (limits.greater !== null) {
    if (value <= limits.greater) {
      throw new Error(`${errorPrefix}must be greater than ${limits.greater}${errorSuffix}`);
    }
  }

  if (limits.lessOrEqual !== null) {
    if (value > limits.lessOrEqual) {
      throw new Error(`${errorPrefix}must not be over ${limits.lessOrEqual}${errorSuffix}`);
    }
  } else if (limits.less !== null) {
    if (value <= limits.less) {
      throw new Error(`${errorPrefix}must be less than ${limits.less}${errorSuffix}`);
    }
  }
}

/**
 * 
 * @param {CompiledCliConfig} config
 * @param {string[]} args
 */
export function processCliArguments(config, args) {
  try {
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
                validateLimits(value.length, opc, `${config.prefix}${curr} value `, " characters long.");
                break;
              case "Number":
                value = Number(value);
                if (Number.isNaN(value)) {
                  throw new Error(`${config.prefix}${curr} value must be a number.`);
                }
                validateLimits(value, opc, `${config.prefix}${curr} value `, "");
                break;
              case "Integer":
                value = Number(value);
                if (Number.isNaN(value) || Math.trunc(value) !== value) {
                  throw new Error(`${config.prefix}${curr} value must be an integer.`);
                }
                validateLimits(value, opc, `${config.prefix}${curr} value `, "");
                break;
              case "Value":
                if (!opc.values.includes(value)) {
                  throw new Error(`${config.prefix}${curr} value must be ${opc.values.map(v => `'${v}'`).join(", ")}.`);
                }
                break;
              case "List":
                value = value.split(opc.seperator);
                validateLimits(value.length, opc, `${config.prefix}${curr} value `, " values long.");
                value.forEach((v, i) => validateLimits(v.length, opc, `${config.prefix}${curr}[${i}] value `, " characters long."))
                break;
              case "NumberList":
                value = value.split(opc.seperator).map((v, i) => {
                  v = Number(v);
                  if (Number.isNaN(v)) {
                    throw new Error(`${config.prefix}${curr}[${i}] value must be a number.`);
                  }
                  validateLimits(v, opc.valueLimits, `${config.prefix}${curr}[${i}] value `, "");
                  return v;
                });
                validateLimits(value.length, opc, `${config.prefix}${curr} value `, " values long.");
                break;
              case "IntegerList":
                value = value.split(opc.seperator).map((v, i) => {
                  v = Number(v);
                  if (Number.isNaN(v) || Math.trunc(v) !== v) {
                    throw new Error(`${config.prefix}${curr}[${i}] value must be an integer.`);
                  }
                  validateLimits(v, opc.valueLimits, `${config.prefix}${curr}[${i}] value `, "");
                  return v;
                });
                validateLimits(value.length, opc, `${config.prefix}${curr} value `, " values long.");
                break;
              case "ValueList":
                value = value.split(opc.seperator);
                validateLimits(value.length, opc, `${config.prefix}${curr} value `, " values long.");
                value.forEach((v, i) => {
                  if (!opc.values.includes(v)) {
                    throw new Error(`${config.prefix}${curr}[${i}] value must be ${opc.values.map(v => `'${v}'`).join(", ")}.`);
                  }
                })
                break;
              case "Bool":
                value = value.toLocaleLowerCase();
                value = value === "true" || value === "yes" || value === "y" || (!Number.isNaN(Number(value)) && Number(value) !== 0)//any non zero number will be considered as a true value
                break;
              case "Help":
                showHelp(config);
                break;
            }

            result[opc.name] = value;
          }
        } else if (!curr) {//curr is empty
          if (value === undefined) {
            if (args.length) {
              value = args.shift();
            } else {
              throw new Error(`No value given for ${config.prefix}`);
            }
          }
          result[config.argList].push(value);
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
  } catch (e) {
    console.log(`Error: ${e.message}\n`);
    process.exit(1)
    // showHelp(config);
  }
}


/**
 * 
 * @param {CliConfig} config
 */
export function parseCliArgs(config = {}) {
  let args = process.argv.slice(2);
  const compiledConfig = compileCliOptions(config);

  //TODO remove debug code
  // console.dir(compiledConfig, { depth: 5 })

  // console.log(compiledConfig.helpText)

  const result = processCliArguments(compiledConfig, args);

  return result;
}


/**
 * setter string that defines the value of the option, e.g. setter '='  --test=123 would convert to {test:"123"} 
 * most values are initialized to null, except the Flag type, that is set to false
 * argList is the name of the parameter that stores all non option arguments
 * 
 * have a parameter to fail on non option args or make it so that is defined by the setting or not of the argList parameter
 * 
 * maybe remove the description from the option themselves and just create a single help text, change the auto help to simply define the help option, or just completly ignore it and just make it get from the result and show it if the flag is true
 * or force the help as always on
 * perhaps make it auto define certain things by the os being used, e.g. use --arg=val on unix and /arg:val on win
 * TODO add flag to show help on processError
 * TODO hifenToCamel
 */
