/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-check",
factory: function (require) {
var plugin=(()=>{var m=Object.create,r=Object.defineProperty;var p=Object.getOwnPropertyDescriptor;var s=Object.getOwnPropertyNames;var l=Object.getPrototypeOf,u=Object.prototype.hasOwnProperty;var h=c=>r(c,"__esModule",{value:!0});var f=c=>{if(typeof require!="undefined")return require(c);throw new Error('Dynamic require of "'+c+'" is not supported')};var g=(c,t)=>{for(var a in t)r(c,a,{get:t[a],enumerable:!0})},k=(c,t,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of s(t))!u.call(c,i)&&i!=="default"&&r(c,i,{get:()=>t[i],enumerable:!(a=p(t,i))||a.enumerable});return c},d=c=>k(h(r(c!=null?m(l(c)):{},"default",c&&c.__esModule&&"default"in c?{get:()=>c.default,enumerable:!0}:{value:c,enumerable:!0})),c);var x={};g(x,{CheckCommand:()=>o,default:()=>n});var e=d(f("@yarnpkg/cli")),o=class extends e.BaseCommand{async execute(){await this.cli.run(["format"]),await this.cli.run(["typecheck"]),await this.cli.run(["lint"])}};o.paths=[["check"]];var n={commands:[o]};return x;})();
return plugin;
}
};
