import * as React from 'react';
import {Styles} from 'ts/types';
import {utils} from 'ts/utils/utils';
import {
    Link as ScrollLink,
} from 'react-scroll';

const headerTypeToScrollOffset = {
    h2: -60,
    h3: -30,
};

interface AnchorTitleProps {
    title: string|React.ReactNode;
    id: string;
    headerType: 'h2'|'h3';
    shouldShowAnchor: boolean;
}

interface AnchorTitleState {
    isHovering: boolean;
}

const styles: Styles = {
    anchor: {
        fontSize: 20,
        transform: 'rotate(45deg)',
        cursor: 'pointer',
    },
    headers: {
        webkitMarginStart: 0,
        webkitMarginEnd: 0,
        fontWeight: 'bold',
        display: 'block',
    },
    h2: {
        fontSize: '1.5em',
        webkitMarginBefore: '0.83em',
        webkitMarginAfter: '0.83em',
    },
    h3: {
        fontSize: '1.17em',
        webkitMarginBefore: '1em',
        webkitMarginAfter: '1em',
    },
};

export class AnchorTitle extends React.Component<AnchorTitleProps, AnchorTitleState> {
    constructor(props: AnchorTitleProps) {
        super(props);
        this.state = {
            isHovering: false,
        };
    }
    public render() {
        let opacity = 0;
        if (this.props.shouldShowAnchor) {
            if (this.state.isHovering) {
                opacity = 0.6;
            } else {
                opacity = 1;
            }
        }
        return (
            <div className="relative flex" style={{...styles[this.props.headerType], ...styles.headers}}>
                <div
                    className="inline-block"
                    style={{paddingRight: 4}}
                >
                    {this.props.title}
                </div>
                <ScrollLink
                    to={this.props.id}
                    offset={headerTypeToScrollOffset[this.props.headerType]}
                    duration={0}
                >
                    <i
                        className="zmdi zmdi-link"
                        onClick={utils.navigateToAnchorId.bind(utils, this.props.id)}
                        style={{...styles.anchor, opacity}}
                        onMouseOver={this.setHoverState.bind(this, true)}
                        onMouseOut={this.setHoverState.bind(this, false)}
                    />
                </ScrollLink>
            </div>
        );
    }
    private setHoverState(isHovering: boolean) {
        this.setState({
            isHovering,
        });
    }
}