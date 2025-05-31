//@ts-check


/** @typedef {"String"|"Number"|"Integer"|"List"|"Bool"|"Flag"} OptionType */
/** @typedef {{type?:OptionType,min?:number,max?:number,alias?:string|string[],defaultValue?:any,seperator?:string,description?:string}} Option */
/** @typedef {{option:string,value:any,alias?:string|string[],description?:string}} Mapping */

/** @typedef {{[key:string]:OptionType|Option}} OptionMap */
/** @typedef {{[key:string]:Mapping}} MappingMap */

/** @typedef {{options?:OptionMap,mappings?:MappingMap,caseSensitive?:boolean,failUnknowFlags?:boolean,prefix?:string,setter?:string,argList?:string,hifenToCamel?:boolean,autoHelp?:boolean,autoSingleChar?:boolean}} CliConfig */


/** @typedef {{name:string,description:string}} BaseOption */
/** @typedef {BaseOption & {min:number|null,max:number|null}} SizedOption */

/** @typedef {SizedOption & {type:"List",seperator:string}} ListOption */
/** @typedef {SizedOption & {type:"Number"|"Integer"|"String"}} SizeOnlyOption */
/** @typedef {BaseOption & {type:"Bool"|"Flag"}} SimpleOption */
/** @typedef {BaseOption & {type:"Mapping",option:string,value:any}} MappingOption */
/** @typedef {ListOption|SizeOnlyOption|SimpleOption|MappingOption} ProcessedOption */

/** @typedef  {{[key:string]:ProcessedOption}} ProcessedOptionMap */


/** @typedef {{options:ProcessedOptionMap,caseSensitive:boolean,failUnknowFlags:boolean,prefix:string,setter:string|null,argList:string,hifenToCamel:boolean,baseResult:{[key:string]:any}}} CompiledCliConfig */


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
 * @param {string[]} alias 
 * @param {string|undefined} description
 * @param {OptionType|"Mapping"} type 
 * @param {number|null} min 
 * @param {number|null} max 
 * @param {string} seperator 
 */
function generateDescription(prefix, alias, description, type, min, max, seperator) {
  return `${alias.map(a => prefix + a).join(" ")}${generateInputExample(type, min, max, seperator)}${typeof description === "string" ? " -> " + description : ""}`;//"TODO description with given text,type aliases and default value";
}


/**
 * 
 * @param {CliConfig} config
 * @returns {CompiledCliConfig}
 */
function compileCliOptions({ options = {}, mappings = {}, caseSensitive = true, failUnknowFlags = true, prefix = "--", setter = "=", argList = "_args", hifenToCamel = false, autoHelp = true, autoSingleChar = false } = {}) {
  const baseResult = {};

  /** @type {ProcessedOptionMap} */
  const processedOptionMap = {}

  for (const [name, opc] of Object.entries(options)) {
    //TODO check and convent the name HERE,simply force it to lowercase here
    /** @type {Option} */
    const val = typeof opc === "string" ? { type: opc } : opc;

    const type = val.type ? val.type : "String"

    const alias = val.alias ? val.alias instanceof Array ? [name, ...val.alias] : [name, val.alias] : [name]
    const seperator = typeof val.seperator === "string" ? val.seperator : ",";
    const min = typeof val.min === "number" ? val.min : null;
    const max = typeof val.max === "number" ? val.max : null;
    if (min !== null && max !== null && max > min) {
      throw new Error(`Error parsing '${name}' option: Minimum is greated than the Maximum`)
    }
    //TODO consider adding the default value in the description
    const description = generateDescription(prefix, alias, val.description, type, min, max, seperator);//"TODO description with given text,type aliases and default value";

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
      //TODO have a check that the name and aliases aren't being repeated between options
      //TODO make that check be case aware
      if (processedOptionMap[a]) {
        throw new Error(`'${a}' is already used by option/mapping '${processedOptionMap[a].name}'`)
      } else {
        processedOptionMap[a] = processedOption;
      }
    }
    //Sets the initial value for the option
    baseResult[name] = type === "Flag" ? false : null
  }

  //process the mappings here
  for (const [name, mapping] of Object.entries(mappings)) {
    //TODO have a check that the name and aliases aren't being repeated between options and mappings
    //TODO make that check be case aware
    const alias = mapping.alias ? mapping.alias instanceof Array ? [name, ...mapping.alias] : [name, mapping.alias] : [name]
    const description = generateDescription(prefix, alias, mapping.description, "Mapping", null, null, "");

    //TODO check that the value is valid for the respective option, if none exist (aka its a "fake" option) the value can be anything
    // Object.hasOwn(baseResult,mapping.option)

    /** @type {MappingOption} */
    let processedOption = { name, type: "Mapping", option: mapping.option, description, value: mapping.value };
    for (let a of alias) {
      //TODO have a check that the name and aliases aren't being repeated between options
      //TODO make that check be case aware
      if (processedOptionMap[a]) {
        throw new Error(`'${a}' is already used by option/mapping '${processedOptionMap[a].name}'`)
      } else {
        processedOptionMap[a] = processedOption;
      }
    }
  }

  return { options: processedOptionMap, caseSensitive, failUnknowFlags, prefix, setter, hifenToCamel, baseResult, argList }
}


/**
 * 
 * @param {CliConfig} config
 */
function parseCliArgs(config = {}) {
  let args = process.argv.slice(2);
  const compiledConfig = compileCliOptions(config);

  console.dir(compiledConfig, { depth: 5 })

  const result = {};
  //check and process the actual args
}


/**
 * setter string that defines the value of the option, e.g. setter '='  --test=123 would convert to {test:"123"} 
 * most values are initialized to null, except the Flag type, that is set to false
 * argList is the name of the parameter that stores all non option arguments
 * 
 * have the single char be a specific thing with its own prefix to allow multiple, only flag types or mappings are supported

 * only allow a single prefix

 * to simplify the way single letter options work simply make that if a name or alias is a single char it can work with the single char system
 * the part above cant work like that, a single char option, that work like '-la' cannot receive any input, it must be a flag or a mapping
 * but it might work as long as the help text generator is aware that it should only work like that only for flags and mappings and the same for the system that will process the input

 * have a parameter to fail on non option args or make it so that is defined by the setting or not of the argList parameter
 */


parseCliArgs({ options: { test: { alias: ["T"], type: "Number", description: "test flag" } }, mappings: { one: { option: "test", value: 1 } } })