import React from 'react';
import { Input, Button } from 'antd';

import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';

import api from 'lib/api';

import Create from 'components/Create.jsx';
import Layout from 'components/Layout/Layout.jsx';
import Kanban from 'components/Kanban.jsx';


@inject("ViewStore")
@inject("DataStore")
@observer class ListBoards extends React.Component {

    constructor(props) {
        super(props);
    }

    createNewBoard () {
        this.props.ViewStore.modal(<Create />);
    }

    handleClick (id){
        this.props.ViewStore.location = <Kanban id={id} />;
    }

    componentDidMount (){
        const { ViewStore, DataStore } = this.props;

        ViewStore.header(<Button
            style={{ margin: '20px' }}
            type="primary" className="right" onClick={ this.createNewBoard.bind(this) }>{ _("Create New Board") }</Button>);

        api.get('board/data').done( (data) => {
            DataStore.boards = data;
        });
    }

    render() {
        return (
            <div className="kanban-boards center" style={{ top: '20%' }}>
                <div>
                    <h3>Your Boards</h3>
                    <br />
                    <ul className="boards-list">
                        {   this.props.DataStore.boards.map( board =>
                            <li key={board.id}>
                                <a onClick={ () => this.handleClick(board.id) } > {board.name} </a>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        );
    }
}

@observer class Boards extends React.Component {
    render () {
        return (
            <Layout>
                <ListBoards />
            </Layout>
        )
    }
}

export default Boards;
