#!/bin/bash

sed -i "" "s/dynamicModule.children.indexOf(freshCacheEntry)/dynamicModule.children?dynamicModule.children.indexOf(freshCacheEntry):-1/g" bundles/yarn.cjs
sed -i "" "s/,_a=_typeModule(_typeModule),/;var _a=_typeModule(_typeModule);/g" bundles/yarn.cjs
