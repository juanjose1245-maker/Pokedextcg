const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'public/vendor/**', // GSAP vendorizado, no es código propio
            'backups/**',
            'cache/**',
            'data/**',
            '.superpowers/**',
            'docs/superpowers/**',
            'graphify-out/**',
        ],
    },

    js.configs.recommended,

    // Backend Node.js: server.js, los scripts de fetch de datos, y este
    // mismo archivo de config. CommonJS (require/module.exports), sin
    // globals de navegador.
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: globals.node,
        },
    },

    // Frontend: public/app.js + public/i18n.js. Se cargan como <script>
    // clásicos (sin bundler, ver CLAUDE.md), NO como módulos, así que
    // comparten un mismo scope global entre ellos. gsap/Draggable/
    // InertiaPlugin vienen de los <script> vendorizados en
    // public/vendor/gsap/ (cargados antes que app.js en index.html), así
    // que también son globals legítimos, no errores de "variable no
    // definida". Base común a ambos archivos:
    {
        files: ['public/app.js', 'public/i18n.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                ...globals.browser,
                gsap: 'readonly',
                Draggable: 'readonly',
                InertiaPlugin: 'readonly',
            },
        },
        rules: {
            // Las funciones/variables de nivel superior en estos archivos
            // se llaman desde index.html (atributos inline) o desde el
            // otro script (mismo scope global), así que no-unused-vars no
            // puede saber si están en uso. vars:"local" desactiva ese
            // chequeo solo para el scope de módulo/script; sigue marcando
            // variables y parámetros sin usar DENTRO de funciones (los
            // catch reales).
            'no-unused-vars': ['error', { vars: 'local' }],
        },
    },

    // app.js además consume `t`, `I18N` e `idiomaActual`, definidas en
    // i18n.js — global solo aquí, no en i18n.js, porque ahí son la
    // declaración original y chocarían con no-redeclare.
    {
        files: ['public/app.js'],
        languageOptions: {
            globals: {
                t: 'readonly',
                I18N: 'readonly',
                idiomaActual: 'writable',
            },
        },
    },

    // Service Worker: contexto propio (self, caches, clients...), sin
    // window/document.
    {
        files: ['public/sw.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: globals.serviceworker,
        },
    },
];
