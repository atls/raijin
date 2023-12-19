/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-check-new",
factory: function (require) {
"use strict";var plugin=(()=>{var e=Object.defineProperty;var m=Object.getOwnPropertyDescriptor;var p=Object.getOwnPropertyNames;var l=Object.prototype.hasOwnProperty;var u=(t=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(t,{get:(i,r)=>(typeof require<"u"?require:i)[r]}):t)(function(t){if(typeof require<"u")return require.apply(this,arguments);throw new Error('Dynamic require of "'+t+'" is not supported')});var f=(t,i)=>{for(var r in i)e(t,r,{get:i[r],enumerable:!0})},x=(t,i,r,s)=>{if(i&&typeof i=="object"||typeof i=="function")for(let o of p(i))!l.call(t,o)&&o!==r&&e(t,o,{get:()=>i[o],enumerable:!(s=m(i,o))||s.enumerable});return t};var h=t=>x(e({},"__esModule",{value:!0}),t);var g={};f(g,{CheckCommand:()=>a,default:()=>n});var c=u("@yarnpkg/cli"),a=class extends c.BaseCommand{async execute(){await this.cli.run(["format"]),await this.cli.run(["typecheck"]),await this.cli.run(["lint"])}};a.paths=[["check"]];var n={commands:[a]};return h(g);})();
return plugin;
}
};
