import * as _ from 'lodash';
import * as React from 'react';
import * as ReactMarkdown from 'react-markdown';
import {colors} from 'material-ui/styles';
import {MenuItem} from 'material-ui';
import {
    Link as ScrollLink,
    Element as ScrollElement,
    scroller,
} from 'react-scroll';
import {KindString, TypeDocNode, DocSections, Styles} from 'ts/types';
import {TopBar} from 'ts/components/top_bar';
import {utils} from 'ts/utils/utils';
import {constants} from 'ts/utils/constants';
import {MethodBlock} from 'ts/pages/documentation/method_block';
import {SourceLink} from 'ts/pages/documentation/source_link';
import {Type} from 'ts/pages/documentation/type';
import {TypeDefinition} from 'ts/pages/documentation/type_definition';
import {MarkdownSection} from 'ts/pages/documentation/markdown_section';
import {Comment} from 'ts/pages/documentation/comment';
import {AnchorTitle} from 'ts/pages/documentation/anchor_title';
import {SectionHeader} from 'ts/pages/documentation/section_header';
import {Docs0xjsMenu, menu} from 'ts/pages/documentation/docs_0xjs_menu';
import * as ZeroExLibraryDocumentation from 'json/0xjs/0.6.1.json';
/* tslint:disable:no-var-requires */
const IntroMarkdown = require('md/docs/0xjs/introduction');
const InstallationMarkdown = require('md/docs/0xjs/installation');
const AsyncMarkdown = require('md/docs/0xjs/async');
const ErrorsMarkdown = require('md/docs/0xjs/errors');
const versioningMarkdown = require('md/docs/0xjs/versioning');
/* tslint:enable:no-var-requires */

const SCROLL_TO_TIMEOUT = 500;

const contractMethodOrder: {[sectionName: string]: string[]} = {
    zeroEx: [
        'signOrderHashAsync',
        'getOrderHashHexAsync',
        'getAvailableAddressesAsync',
        'setProviderAsync',
        'isValidOrderHash',
        'isValidSignature',
        'generatePseudoRandomSalt',
        'toBaseUnitAmount',
        'toUnitAmount',
    ],
    exchange: [
        'fillOrderAsync',
        'batchFillOrderAsync',
        'cancelOrderAsync',
        'batchCancelOrderAsync',
        'fillOrKillOrderAsync',
        'batchFillOrKillAsync',
        'fillOrdersUpToAsync',
        'getFilledTakerAmountAsync',
        'getCanceledTakerAmountAsync',
        'getUnavailableTakerAmountAsync',
        'subscribeAsync',
        'stopWatchingAllEventsAsync',
        'getContractAddressAsync',
    ],
    token: [
        'getAllowanceAsync',
        'getBalanceAsync',
        'getProxyAllowanceAsync',
        'setAllowanceAsync',
        'setProxyAllowanceAsync',
        'transferAsync',
        'transferFromAsync',
    ],
    tokenRegistry: [
        'getTokensAsync',
    ],
};

const sectionNameToMarkdown = {
    [DocSections.introduction]: IntroMarkdown,
    [DocSections.installation]: InstallationMarkdown,
    [DocSections.async]: AsyncMarkdown,
    [DocSections.errors]: ErrorsMarkdown,
    [DocSections.versioning]: versioningMarkdown,
};

const sectionNameToModulePath: {[name: string]: string} = {
    [DocSections.zeroEx]: '"src/0x"',
    [DocSections.exchange]: '"src/contract_wrappers/exchange_wrapper"',
    [DocSections.tokenRegistry]: '"src/contract_wrappers/token_registry_wrapper"',
    [DocSections.token]: '"src/contract_wrappers/token_wrapper"',
    [DocSections.types]: '"src/types"',
};

export interface ZeroExJSDocumentationProps {
    source: string;
    location: Location;
}

interface ZeroExJSDocumentationState {}

const styles: Styles = {
    mainContainers: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        overflowZ: 'hidden',
        overflowY: 'scroll',
        minHeight: 'calc(100vh - 77px)',
        WebkitOverflowScrolling: 'touch',
    },
    menuContainer: {
        borderColor: colors.grey300,
        width: 170,
    },
};

export class ZeroExJSDocumentation extends React.Component<ZeroExJSDocumentationProps, ZeroExJSDocumentationState> {
    public componentDidMount() {
        const hashWithPrefix = this.props.location.hash;
        let hash = hashWithPrefix.slice(1);
        if (_.isEmpty(hash)) {
            hash = 'zeroExJSDocs'; // scroll to the top
        }
        this.scrollToHash(hash);
    }
    public render() {
        return (
            <div id="zeroExJSDocs">
                <TopBar
                    blockchainIsLoaded={false}
                    location={this.props.location}
                />
                <div
                    className="mx-auto max-width-4 flex"
                    style={{color: colors.grey800, paddingTop: 44}}
                >
                    <div className="relative col md-col-2 lg-col-2 lg-pl0 md-pl1 sm-hide xs-hide">
                        <div
                            className="border-right absolute pt3"
                            style={{...styles.menuContainer, ...styles.mainContainers}}
                        >
                            <Docs0xjsMenu />
                        </div>
                    </div>
                    <div className="relative col lg-col-10 md-col-10 sm-col-12 col-12 mt2 pt2">
                        <div
                            id="documentation"
                            style={styles.mainContainers}
                            className="absolute"
                        >
                            <h1 className="pl3">
                                <a href={constants.GITHUB_0X_JS_URL} target="_blank">
                                    0x.js
                                </a>
                            </h1>
                            {this.renderDocumentation()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    private renderDocumentation() {
        const subMenus = _.values(menu);
        const orderedSectionNames = _.flatten(subMenus);
        const sections = _.map(orderedSectionNames, sectionName => {
            const packageDefinitionIfExists: TypeDocNode = this.getPackageDefinitionBySectionNameIfExists(sectionName);

            const markdownFileIfExists = sectionNameToMarkdown[sectionName];
            if (!_.isUndefined(markdownFileIfExists)) {
                return (
                    <MarkdownSection
                        key={`markdown-section-${sectionName}`}
                        sectionName={sectionName}
                        markdownContent={markdownFileIfExists}
                    />
                );
            }

            // Since the `types.ts` file is the only file that does not export a module/class but
            // instead has each type export itself, we do not need to go down two levels of nesting
            // for it.
            let entities;
            let packageComment = '';
            if (sectionName === 'types') {
                entities = packageDefinitionIfExists.children;
            } else {
                entities = packageDefinitionIfExists.children[0].children;
                const commentObj = packageDefinitionIfExists.children[0].comment;
                packageComment = !_.isUndefined(commentObj) ? commentObj.shortText : packageComment;
            }

            const constructors = _.filter(entities, e => e.kindString === KindString.Constructor);

            const publicProperties = _.filter(entities, e => {
                return e.kindString === KindString.Property && !utils.isPrivateOrProtectedProperty(e.name);
            });
            const publicPropertyDefs = _.map(publicProperties, property => this.renderProperty(property));

            const methods = _.filter(entities, e => e.kindString === KindString.Method);
            const orderedMethods = this.orderMethods(sectionName, methods);
            const isConstructor = false;
            const methodDefs = _.map(orderedMethods, method => {
                return this.renderMethodBlocks(method, sectionName, isConstructor);
            });

            const types = _.filter(entities, e => {
                return e.kindString === KindString.Interface || e.kindString === KindString.Function ||
                       e.kindString === KindString['Type alias'] || e.kindString === KindString.Variable;
            });
            const typeDefs = _.map(types, type => {
                return (
                    <TypeDefinition
                        key={`type-${type.name}`}
                        type={type}
                    />
                );
            });
            return (
                <div
                    key={`section-${sectionName}`}
                    className="py2 px3"
                >
                    <SectionHeader sectionName={sectionName} />
                    <Comment
                        comment={packageComment}
                    />
                    {sectionName === DocSections.zeroEx && constructors.length > 0 &&
                        <div>
                            <h2 className="thin">Constructor</h2>
                            {this.renderZeroExConstructors(constructors)}
                        </div>
                    }
                    {publicPropertyDefs.length > 0 &&
                        <div>
                            <h2 className="thin">Properties</h2>
                            <div>{publicPropertyDefs}</div>
                        </div>
                    }
                    {methodDefs.length > 0 &&
                        <div>
                            <h2 className="thin">Methods</h2>
                            <div>{methodDefs}</div>
                        </div>
                    }
                    {typeDefs.length > 0 &&
                        <div>
                            <div>{typeDefs}</div>
                        </div>
                    }
                </div>
            );
        });

        return sections;
    }
    private renderZeroExConstructors(constructors: TypeDocNode[]) {
        const isConstructor = true;
        const constructorDefs = _.map(constructors, constructor => {
            return this.renderMethodBlocks(constructor, DocSections.zeroEx, isConstructor);
        });
        return (
            <div>
                {constructorDefs}
            </div>
        );
    }
    private renderProperty(property: TypeDocNode) {
        const source = property.sources[0];
        return (
            <div
                key={`property-${property.name}-${property.type.name}`}
                className="pb3"
            >
                <code className="hljs">
                    {property.name}: <Type type={property.type} />
                </code>
                <SourceLink source={source} />
                {property.comment &&
                    <Comment
                        comment={property.comment.shortText}
                        className="py2"
                    />
                }
            </div>
        );
    }
    private renderMethodBlocks(method: TypeDocNode, sectionName: string, isConstructor: boolean) {
        const signatures = method.signatures;
        const renderedSignatures = _.map(signatures, (signature: TypeDocNode, i: number) => {
            const source = method.sources[i];
            let entity = method.flags.isStatic ? 'ZeroEx.' : 'zeroEx.';
            // Hack: currently the section names are identical as the property names on the ZeroEx class
            // For now we reply on this mapping to construct the method entity. In the future, we should
            // do this differently.
            entity = (sectionName !== DocSections.zeroEx) ? `${entity}${sectionName}.` : entity;
            entity = isConstructor ? '' : entity;
            return (
                <MethodBlock
                    key={`method-${source.name}-${source.line}`}
                    isConstructor={isConstructor}
                    isStatic={method.flags.isStatic}
                    methodSignature={signature}
                    source={source}
                    entity={entity}
                />
            );
        });
        return renderedSignatures;
    }
    private orderMethods(sectionName: string, methods: TypeDocNode[]) {
        const methodByName: {[name: string]: TypeDocNode} = {};
        _.each(methods, method => {
            methodByName[method.name] = method;
        });
        const sectionMethodOrder = contractMethodOrder[sectionName];
        const orderedMethods = _.map(sectionMethodOrder, methodName => {
            return methodByName[methodName];
        });
        return orderedMethods;
    }
    private getPackageDefinitionBySectionNameIfExists(sectionName: string) {
        const modulePathName = sectionNameToModulePath[sectionName];
        const modules: TypeDocNode[] = (ZeroExLibraryDocumentation as any).children;
        const moduleWithName = _.find(modules, {name: modulePathName});
        return moduleWithName;
    }
    private scrollToHash(hash: string) {
        if (!_.isEmpty(hash)) {
            // HACK: For some reason calling scroller.scrollTo immediately from componentDidMount does
            // not work. Waiting 500ms however, gives the page enough time for the call to succeed.
            window.setTimeout(() => {
                scroller.scrollTo(hash, {duration: 0, offset: 0, containerId: 'documentation'});
            }, SCROLL_TO_TIMEOUT);
        }
    }
}
