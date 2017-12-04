import React from 'react'
import ReactDom, { render } from 'react-dom'
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { Provider, observer } from "mobx-react";

import Boards from 'components/Boards.jsx';
import DataStore from 'stores/DataStore.js';
import ViewStore from 'stores/ViewStore.js';
import Create from 'components/Create.jsx';
import Kanban from 'components/Kanban.jsx';

import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';

import '../less/index.less';

@DragDropContext(HTML5Backend)
@observer class LoadOnce extends React.Component {

    constructor(props) {
        super(props);
        const ClaStore = props.ClaStore;
        this.view = new ViewStore(this.props.parentEl);
        this.data = new DataStore( this.view, ClaStore );

        if (ClaStore.location === 'new') {
            this.view.location = <Create />
        } else if (ClaStore.location === 'board') {
            this.view.location = <Kanban id={ClaStore.id} />
        }
    }

    render (){
        return (
            <Provider ClaStore={this.props.ClaStore} ViewStore={ this.view } DataStore={ this.data }>
                { this.view.location || <Boards /> }
            </Provider>
        )
    }
}

const build = (ClaStore) => {
    // ClaStore passed from clarive core
    const el = ClaStore ? ClaStore.el : document.getElementById('kanban-comp');

    var t = setInterval(function(){
        if ( !document.body.contains(el)){
            clearInterval(t);
            ReactDom.unmountComponentAtNode(el);
        }
    }, 500);

    render((
        <LocaleProvider locale={enUS}>
            <LoadOnce ClaStore={ ClaStore || {} } parentEl={el} />
        </LocaleProvider>
    ), el);
}

export { build }
