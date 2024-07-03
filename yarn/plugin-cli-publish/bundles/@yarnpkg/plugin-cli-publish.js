/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-cli-publish",
factory: function (require) {
"use strict";var plugin=(()=>{var p=Object.defineProperty;var s=Object.getOwnPropertyDescriptor;var c=Object.getOwnPropertyNames;var f=Object.prototype.hasOwnProperty;var g=(r,e)=>{for(var n in e)p(r,n,{get:e[n],enumerable:!0})},m=(r,e,n,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of c(e))!f.call(r,o)&&o!==n&&p(r,o,{get:()=>e[o],enumerable:!(i=s(e,o))||i.enumerable});return r};var k=r=>m(p({},"__esModule",{value:!0}),r);var d={};g(d,{beforeWorkspacePacking:()=>t,default:()=>a});var t=(r,e)=>{e.name==="@atls/yarn-cli"&&(e.dependencies=new Proxy({},{set:()=>!0}))};var a={hooks:{beforeWorkspacePacking:t}};return k(d);})();
return plugin;
}
};
