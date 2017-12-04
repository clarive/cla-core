import React from 'react';
import { observer, inject } from 'mobx-react';

import SideBar from './SideBar.jsx';
import Header from './Header.jsx';
import { LoadingMask } from "components/UI.jsx"

@inject("ViewStore")
@observer class Body extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {

        const ViewStore = this.props.ViewStore;

        const sideBarPosition = ViewStore.sideBarComp ?
            (ViewStore.sideBarComp.props.position || 'right') :
            null;

        const top = $( ViewStore.node ).find('.body').scrollTop();

        return (
            <div
                className={ 'body' + (ViewStore.sideBarComp ? (' with-side-bar ' + sideBarPosition ) : '')
            }>

                { this.props.body }
                { this.props.ViewStore.bodyComp }

                {   ViewStore.overlayLoading &&
                    <LoadingMask containerClass="body" />
                }
            </div>
        )
    }
}


@inject("ViewStore")
@observer class Layout extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount () {
        const { defaultHeader, ViewStore } = this.props;
        if (defaultHeader) {
            ViewStore.setDefaultHeader(defaultHeader);
        }
    }

    render() {
        return (
            <div className="kanban-container" style={{ width: '100%', height: '100%' }}>
                <Header />
                <Body body={this.props.children} />

                { this.props.ViewStore.sideBarComp &&
                    <SideBar />
                }

                { this.props.ViewStore.modalComp !== null && this.props.ViewStore.modalComp }
            </div>
        );
    }
}

export default Layout;
