import type { Linter } from 'eslint'

export const rules: Linter.RulesRecord = {
  'jsx-a11y/html-has-lang': ['off'],
  'jsx-a11y/accessible-emoji': ['off'],
  'jsx-a11y/alt-text': [
    'error',
    {
      elements: ['img', 'object', 'area', 'input[type="image"]'],
      img: [],
      object: [],
      area: [],
      'input[type="image"]': [],
    },
  ],
  'jsx-a11y/anchor-has-content': [
    'error',
    {
      components: [],
    },
  ],
  'jsx-a11y/anchor-is-valid': [
    'error',
    {
      components: ['Link'],
      specialLink: ['to'],
      aspects: ['noHref', 'invalidHref', 'preferButton'],
    },
  ],
  'jsx-a11y/aria-activedescendant-has-tabindex': ['error'],
  'jsx-a11y/aria-props': ['error'],
  'jsx-a11y/aria-proptypes': ['error'],
  'jsx-a11y/aria-role': [
    'error',
    {
      ignoreNonDOM: false,
    },
  ],
  'jsx-a11y/aria-unsupported-elements': ['error'],
  'jsx-a11y/autocomplete-valid': [
    'off',
    {
      inputComponents: [],
    },
  ],
  'jsx-a11y/click-events-have-key-events': ['error'],
  'jsx-a11y/control-has-associated-label': [
    'error',
    {
      labelAttributes: ['label'],
      controlComponents: [],
      ignoreElements: ['audio', 'canvas', 'embed', 'input', 'textarea', 'tr', 'video'],
      ignoreRoles: [
        'grid',
        'listbox',
        'menu',
        'menubar',
        'radiogroup',
        'row',
        'tablist',
        'toolbar',
        'tree',
        'treegrid',
      ],
      depth: 5,
    },
  ],
  'jsx-a11y/heading-has-content': [
    'error',
    {
      components: [''],
    },
  ],
  'jsx-a11y/iframe-has-title': ['error'],
  'jsx-a11y/img-redundant-alt': ['error'],
  'jsx-a11y/interactive-supports-focus': ['error'],
  'jsx-a11y/label-has-associated-control': [
    'error',
    {
      labelComponents: [],
      labelAttributes: [],
      controlComponents: [],
      assert: 'both',
      depth: 25,
    },
  ],
  'jsx-a11y/lang': ['error'],
  'jsx-a11y/media-has-caption': [
    'error',
    {
      audio: [],
      video: [],
      track: [],
    },
  ],
  'jsx-a11y/mouse-events-have-key-events': ['error'],
  'jsx-a11y/no-access-key': ['error'],
  'jsx-a11y/no-autofocus': [
    'error',
    {
      ignoreNonDOM: true,
    },
  ],
  'jsx-a11y/no-distracting-elements': [
    'error',
    {
      elements: ['marquee', 'blink'],
    },
  ],
  'jsx-a11y/no-interactive-element-to-noninteractive-role': [
    'error',
    {
      tr: ['none', 'presentation'],
    },
  ],
  'jsx-a11y/no-noninteractive-element-interactions': [
    'error',
    {
      handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
    },
  ],
  'jsx-a11y/no-noninteractive-element-to-interactive-role': [
    'error',
    {
      ul: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'],
      ol: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'],
      li: ['menuitem', 'option', 'row', 'tab', 'treeitem'],
      table: ['grid'],
      td: ['gridcell'],
    },
  ],
  'jsx-a11y/no-noninteractive-tabindex': [
    'error',
    {
      tags: [],
      roles: ['tabpanel'],
    },
  ],
  'jsx-a11y/no-onchange': ['off'],
  'jsx-a11y/no-redundant-roles': ['error'],
  'jsx-a11y/no-static-element-interactions': [
    'error',
    {
      handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
    },
  ],
  'jsx-a11y/role-has-required-aria-props': ['error'],
  'jsx-a11y/role-supports-aria-props': ['error'],
  'jsx-a11y/scope': ['error'],
  'jsx-a11y/tabindex-no-positive': ['error'],
  'jsx-a11y/label-has-for': [
    'off',
    {
      components: [],
      required: {
        every: ['nesting', 'id'],
      },
      allowChildren: false,
    },
  ],
  'react/function-component-definition': [
    'error',
    {
      namedComponents: 'arrow-function',
      unnamedComponents: 'arrow-function',
    },
  ],
  'react/hook-use-state': ['error', { allowDestructuredState: true }],
  'react/jsx-props-no-spreading': [
    'off',
    {
      html: 'enforce',
      custom: 'enforce',
      explicitSpread: 'ignore',
      exceptions: [],
    },
  ],
  'react/jsx-filename-extension': [
    1,
    {
      extensions: ['.js', '.jsx', '.tsx'],
    },
  ],
  'react/prop-types': ['off'],
  'react/no-danger': ['off'],
  'react/jsx-child-element-spacing': 'off',
  'react/jsx-closing-bracket-location': 'off',
  'react/jsx-closing-tag-location': 'off',
  'react/jsx-curly-newline': 'off',
  'react/jsx-curly-spacing': 'off',
  'react/jsx-equals-spacing': 'off',
  'react/jsx-first-prop-new-line': 'off',
  'react/jsx-indent': 'off',
  'react/jsx-indent-props': 'off',
  'react/jsx-max-props-per-line': 'off',
  'react/jsx-newline': 'off',
  'react/jsx-one-expression-per-line': 'off',
  'react/jsx-props-no-multi-spaces': 'off',
  'react/jsx-tag-spacing': 'off',
  'react/jsx-wrap-multilines': 'off',
  'react/jsx-space-before-closing': ['off', 'always'],
  'react-hooks/rules-of-hooks': ['error'],
  'react-hooks/exhaustive-deps': ['error'],
  'react/display-name': [
    'off',
    {
      ignoreTranspilerName: false,
    },
  ],
  'react/forbid-prop-types': [
    'error',
    {
      forbid: ['any', 'array', 'object'],
      checkContextTypes: true,
      checkChildContextTypes: true,
    },
  ],
  'react/forbid-dom-props': [
    'off',
    {
      forbid: [],
    },
  ],
  'react/jsx-boolean-value': [
    'error',
    'never',
    {
      always: [],
    },
  ],
  'react/jsx-handler-names': [
    'error',
    {
      eventHandlerPrefix: 'on',
      eventHandlerPropPrefix: 'on',
    },
  ],
  'react/jsx-no-leaked-render': [
    'off',
    {
      validStrategies: ['coerce'],
    },
  ],
  'react/jsx-key': [
    'error',
    {
      warnOnDuplicates: true,
    },
  ],
  'react/jsx-no-bind': [
    'error',
    {
      ignoreRefs: true,
      allowArrowFunctions: true,
      allowFunctions: false,
      allowBind: false,
      ignoreDOMComponents: true,
    },
  ],
  'react/jsx-no-duplicate-props': [
    'error',
    {
      ignoreCase: true,
    },
  ],
  'react/jsx-no-literals': [
    'off',
    {
      noStrings: true,
    },
  ],
  'react/jsx-no-undef': ['error'],
  'react/jsx-pascal-case': [
    'error',
    {
      allowNamespace: true,
      allowAllCaps: true,
      ignore: [],
    },
  ],
  'react/sort-prop-types': [
    'off',
    {
      ignoreCase: true,
      callbacksLast: false,
      requiredFirst: false,
      sortShapeProp: true,
    },
  ],
  'react/jsx-sort-prop-types': ['off'],
  'react/jsx-sort-props': [
    'error',
    {
      ignoreCase: true,
      multiline: 'last',
      reservedFirst: true,
      callbacksLast: true,
      shorthandFirst: true,
      noSortAlphabetically: true,
    },
  ],
  'react/jsx-sort-default-props': [
    'off',
    {
      ignoreCase: true,
    },
  ],
  'react/jsx-uses-vars': ['error'],
  'react/no-deprecated': ['error'],
  'react/no-did-mount-set-state': ['off'],
  'react/no-did-update-set-state': ['error'],
  'react/no-will-update-set-state': ['error'],
  'react/no-direct-mutation-state': ['off'],
  'react/no-is-mounted': ['error'],
  'react/no-multi-comp': ['error', { ignoreStateless: true }],
  'react/no-set-state': ['off'],
  'react/no-string-refs': ['error'],
  'react/no-unknown-property': ['error'],
  'react/prefer-es6-class': ['error', 'always'],
  'react/prefer-stateless-function': [
    'error',
    {
      ignorePureComponents: true,
    },
  ],
  'react/require-render-return': ['error'],
  'react/self-closing-comp': ['error'],
  'react/sort-comp': [
    'error',
    {
      order: [
        'static-variables',
        'static-methods',
        'instance-variables',
        'lifecycle',
        '/^handle.+$/',
        '/^on.+$/',
        'getters',
        'setters',
        '/^(get|set)(?!(InitialState$|DefaultProps$|ChildContext$)).+$/',
        'instance-methods',
        'everything-else',
        'rendering',
      ],
      groups: {
        lifecycle: [
          'displayName',
          'propTypes',
          'contextTypes',
          'childContextTypes',
          'mixins',
          'statics',
          'defaultProps',
          'constructor',
          'getDefaultProps',
          'getInitialState',
          'state',
          'getChildContext',
          'getDerivedStateFromProps',
          'componentWillMount',
          'UNSAFE_componentWillMount',
          'componentDidMount',
          'componentWillReceiveProps',
          'UNSAFE_componentWillReceiveProps',
          'shouldComponentUpdate',
          'componentWillUpdate',
          'UNSAFE_componentWillUpdate',
          'getSnapshotBeforeUpdate',
          'componentDidUpdate',
          'componentDidCatch',
          'componentWillUnmount',
        ],
        rendering: ['/^render.+$/', 'render'],
      },
    },
  ],
  'react/jsx-no-target-blank': [
    'error',
    {
      enforceDynamicLinks: 'always',
      links: true,
      forms: false,
    },
  ],
  'react/jsx-no-comment-textnodes': ['error'],
  'react/no-render-return-value': ['error'],
  'react/require-optimization': [
    'off',
    {
      allowDecorators: [],
    },
  ],
  'react/no-find-dom-node': ['error'],
  'react/forbid-component-props': [
    'off',
    {
      forbid: [],
    },
  ],
  'react/forbid-elements': [
    'off',
    {
      forbid: [],
    },
  ],
  'react/no-danger-with-children': ['error'],
  'react/no-unused-prop-types': [
    'error',
    {
      customValidators: [],
      skipShapeProps: true,
    },
  ],
  'react/style-prop-object': ['error'],
  'react/no-unescaped-entities': ['error'],
  'react/no-children-prop': ['error'],
  'react/no-array-index-key': ['error'],
  'react/require-default-props': ['off'],
  'react/forbid-foreign-prop-types': [
    'warn',
    {
      allowInPropTypes: true,
    },
  ],
  'react/void-dom-elements-no-children': ['error'],
  'react/default-props-match-prop-types': ['off'],
  'react/no-redundant-should-component-update': ['error'],
  'react/no-unused-state': ['error'],
  'react/boolean-prop-naming': [
    'off',
    {
      propTypeNames: ['bool', 'mutuallyExclusiveTrueProps'],
      rule: '^(is|has)[A-Z]([A-Za-z0-9]?)+',
      message: '',
    },
  ],
  'react/no-typos': ['error'],
  'react/jsx-curly-brace-presence': [
    'error',
    {
      props: 'never',
      children: 'never',
      propElementValues: 'always',
    },
  ],
  'react/destructuring-assignment': ['error', 'always'],
  'react/no-access-state-in-setstate': ['error'],
  'react/button-has-type': [
    'error',
    {
      button: true,
      submit: true,
      reset: false,
    },
  ],
  'react/no-this-in-sfc': ['error'],
  'react/jsx-max-depth': ['off'],
  'react/no-unsafe': ['error', { checkAliases: true }],
  'react/jsx-fragments': ['error', 'syntax'],
  'react/state-in-constructor': ['error', 'always'],
  'react/static-property-placement': ['error', 'property assignment'],
  'react/prefer-read-only-props': ['off'],
  'react/jsx-no-script-url': [
    'error',
    [
      {
        name: 'Link',
        props: ['to'],
      },
    ],
  ],
  'react/jsx-no-useless-fragment': ['error'],
  'react/no-adjacent-inline-elements': ['off'],
  'react/jsx-no-constructed-context-values': ['error'],
  'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
  'react/no-namespace': ['error'],
  'react/prefer-exact-props': ['error'],
  'react/no-arrow-function-lifecycle': ['error'],
  'react/no-invalid-html-attribute': ['error'],
  'react/no-unused-class-component-methods': ['error'],
}
