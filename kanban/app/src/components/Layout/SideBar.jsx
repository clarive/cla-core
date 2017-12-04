import React from 'react';
import { observe } from 'mobx';
import { observer, inject } from 'mobx-react';

@inject("ViewStore")
@observer class SideBar extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        const sideBarComp = this.props.ViewStore.sideBarComp;
        const position = sideBarComp.props.position || 'right'
        return (
            <div className={'side-bar ' + ( position ) }>
                { sideBarComp }
            </div>
        );
    }
}

export default SideBar;
