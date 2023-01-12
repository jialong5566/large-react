import {getBaseRollupPlugins, getPackageJSON, resolvePkgPath} from './utils';
import generatePackageJson from "rollup-plugin-generate-package-json";
import alias from "@rollup/plugin-alias";

const {name, module, peerDependencies} = getPackageJSON('react-dom');
const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

export default [
    {
        input: `${pkgPath}/${module}`,
        output: [
            {
                file: `${pkgDistPath}/index.js`,
                name: `ReactDOM`,
                format: 'umd'
            },
            {
                file: `${pkgDistPath}/client.js`,
                name: `client`,
                format: 'umd'
            }
        ],
        external: [...Object.keys(peerDependencies)],
        plugins: [
            ...getBaseRollupPlugins(),
        ]
    },
    {
        input: `${pkgPath}/test-utils.ts`,
        output: [
            {
                file: `${pkgDistPath}/test-utils.js`,
                name: `testUtils.js`,
                format: 'umd'
            }
        ],
        external: ['react-dom', 'react'],
        plugins: [
            ...getBaseRollupPlugins(),
            alias({
                entries: {
                    hostConfig: `${pkgPath}/src/hostConfig.ts`
                }
            }),
            generatePackageJson({
                inputFolder: pkgPath,
                outputFolder: pkgDistPath,
                baseContents: ({name, description, version}) => ({
                    name,
                    description,
                    version,
                    peerDependencies: {
                        version
                    },
                    main: 'index.js'
                })
            })
        ]
    },
];