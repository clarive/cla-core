import React from 'react';
import { observer, inject } from 'mobx-react';

@inject("ViewStore")
@observer class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const header = this.props.ViewStore.headerComp ?
            this.props.ViewStore.headerComp : this.props.ViewStore.defaultHeader;

        return (
            <div className="header">
                { header }
            </div>
        )
    }
}

export default Header;
