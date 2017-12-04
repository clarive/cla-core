import React from 'react';
import { observer, inject, Provider } from 'mobx-react';
import { observable } from 'mobx';
import { DropTarget, DragSource } from 'react-dnd';

import { Alert, Popconfirm, Tabs, Input, InputNumber, Form, Button, Menu, Icon } from 'antd';
const ButtonGroup = Button.Group;
const FormItem = Form.Item;
const TabPane = Tabs.TabPane;

import api from 'lib/api';
import { deepCopy } from 'lib/utils';
import store from 'stores/StaticStore';

import {
    SelectUsers,
    SelectStatuses
} from 'components/FormItems/Select.jsx'

import BasicFilter from 'components/Filter/Basic.jsx';

const defaultColumns = [
    {
        name : 'New',
        wip: 0,
        total: 0,
        collapsed: 0,
        statuses: [],
        cards: [],
    },
    {
        name : 'In Progress',
        wip: 0,
        total: 0,
        collapsed: 0,
        statuses: [],
        cards: []
    },
    {
        name : 'Done',
        wip: 0,
        total: 0,
        collapsed: 0,
        statuses: [],
        cards: []
    }
];

// Configure header section
@inject("DataStore")
@inject("ViewStore")
@inject("ClaStore")
@observer class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    close () {
        // reset view to the defaults
        // => back to Kanban board
        this.props.ViewStore.reset();
    }

    save () {

        const { localStore, ViewStore, DataStore, ClaStore } = this.props;

        let lists = deepCopy( localStore.lists );
        lists.forEach(function(list){
            delete list.total;
            list.cards = [];
            list.collapsed = 0;
        });

        const settings = {
            filter: localStore.filter,
            lists: lists,
            users: localStore.users
        };

        api.postJSON('board/save', {
            id: DataStore.id,
            name: localStore.name,
            settings: JSON.stringify(settings)
        }).done( (data) => {
            this.close();
            DataStore.reset(data.id);
            ViewStore.reloadLists();
            if (ClaStore && ClaStore.onNewSettings) {
                ClaStore.onNewSettings( data );
            }
        });
    }

    deleteBoard () {
        const { DataStore } = this.props;
        DataStore.deleteBoard();
    }

    render() {

        const { DataStore } = this.props;
        const confirmTxt = _("Are you sure you want to delete this board?");

        return (
            <Menu
                mode="horizontal"
                defaultSelectedKeys={[]}
                style={{padding: '7px', border: 0 }}
            >
                <Menu.Item key="delete" style={{ cursor: 'default', float:'left', border: 0 }}>
                    { !DataStore.isTempBoard &&
                        <Popconfirm placement="bottomLeft" title={confirmTxt} onConfirm={ this.deleteBoard.bind(this) } okText="Yes" cancelText="No">
                            <Button icon="delete" type="primary">{ _("Delete") }</Button>
                        </Popconfirm>
                    }
                    { DataStore.isTempBoard &&
                        <Alert style={{ marginTop: '3px', fontSize: '8px' }} message={ _("This is a temporary board, when you click save, it will be saved permanently in database") } type="warning" showIcon />
                    }
                </Menu.Item>

                <Menu.Item key="save" style={{ float:'right', border: 0 }}>
                    <ButtonGroup>
                        <Button onClick={ this.close.bind(this) }>{ _("Cancel") }</Button>
                        <Button icon="check" type="primary" onClick={ this.save.bind(this) }>{ _("Save") }</Button>
                    </ButtonGroup>
                </Menu.Item>
            </Menu>
        );
    }
}


@inject("DataStore")
@inject("localStore")
@observer class General extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    handleChange (type, value) {
        this.props.localStore[type] = value;
    }

    updateName (e) {
        this.props.localStore.name = e.target.value;
    }

    render() {

        const { localStore, DataStore } = this.props;
        const selectedUsers = localStore.users.toJS();

        return (
            <div>
                <Form layout="vertical">

                    <FormItem label={ _("Board Name") }>
                        <Input
                            onBlur={ (e) => this.updateName(e) }
                            defaultValue={localStore.name}
                            style={{width: '100%'}} />
                    </FormItem>

                    <FormItem label={ _("Share With") }>
                        <SelectUsers
                            valueField="username"
                            defaultValue={selectedUsers}
                            onChange={ (v) => this.handleChange('users', v) }
                        />
                    </FormItem>
                </Form>
            </div>
        )
    }
}

const dragSource = {
    beginDrag(props, monitor, component) {
        const { list, DataStore, ViewStore } = props;

        // dragging does not work without hiding
        // antd multi select component!!
        $( ViewStore.node ).find('.statuses-list ul').hide();
        return props;
    },
    endDrag(props, monitor) {
        const { DataStore, ViewStore } = props;
        $( ViewStore.node ).find('.statuses-list ul').show();
    }
};

const dragTarget = {
    hover(props, monitor, component) {
        const { list: dragList, localStore } = monitor.getItem()
        const { list } = props

        const index = localStore.lists.indexOf(list);
        const dragIndex = localStore.lists.indexOf(dragList);

        if (index === dragIndex) {
            return;
        }

        localStore.lists.splice( index, 1 );
        localStore.lists.splice( dragIndex, 0, list );
    }
}


@inject("ViewStore")
@inject("localStore")
@DragSource("column", dragSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
}))
@DropTarget("column", dragTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
}))
@observer class Column extends React.Component {

    constructor(props) {
        super(props);
    }

    updateWip (list, value) {
        list.wip = value;
    }

    deleteStatus (list, value) {
        const index = list.statuses.indexOf(value);
        list.statuses.splice(index, 1);
        list.cards = [];
    }

    addStatus (list, value, label) {
        this.props.localStore.lists.forEach(function(li){
            const index = li.statuses.indexOf(value);
            if (index !== -1){
                li.statuses.splice( index, 1 );
            }
        });

        list.statuses.push(value);
    }

    deleteList(list) {
        const index = this.props.localStore.lists.indexOf(list);
        this.props.localStore.lists.splice(index, 1);
    }

    updateName (list, e) {
        const { value } = e.target;
        list.name = value;
    }

    selectedStatuses(list) {
        const statuses = list.statuses.toJS();
        return statuses;
    }

    render () {
        const { localStore, connectDragSource, connectDropTarget, list, isDragging } = this.props;

        return connectDragSource(connectDropTarget(
            <div className='list' style={{ opacity: isDragging ? 0.5 : 1 }}>
                <div className="head" style={{ cursor: 'default', padding: '10px' }}>
                    <Button  className="drag" icon="swap" size="small"
                        style={{ cursor: 'move', margin: '5px 0', float: 'left' }} />

                    <Button
                        onClick={ this.deleteList.bind(this, list) }
                        style={{ margin: '5px 0', float: 'right' }}
                        icon="delete"
                        size="small"
                    />
                </div>
                <div className="list-body">
                    <div className="cards-wrap">
                        <div className="card">
                            <div className="card-body">
                                <Input size="large"
                                    onBlur={this.updateName.bind(this, list)}
                                    defaultValue={list.name}
                                />
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-body">
                                <FormItem label={ _("WIP") }>
                                    <InputNumber
                                        style={{width: '100%'}}
                                        min={0}
                                        defaultValue={list.wip}
                                        onChange={ this.updateWip.bind(this, list) }
                                    />
                                </FormItem>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-body">
                                <FormItem label={ _("Map Statuses") }>
                                    <SelectStatuses className="statuses-list"
                                        style={{width: '100%'}}
                                        value={ list.statuses.toJS() }
                                        onSelect={ this.addStatus.bind(this, list) }
                                        onDeselect={ this.deleteStatus.bind(this, list) }
                                    />
                                </FormItem>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ))
    }
}

// Configure columns section
@inject("localStore")
@observer class Columns extends React.Component {

    constructor(props) {
        super(props);
    }

    createNewList () {
        this.props.localStore.lists.push({
            name : 'Column ' + this.props.localStore.lists.length,
            wip: 0,
            total: 0,
            collapsed: 0,
            statuses: []
        });
    }

    render() {

        const { localStore } = this.props;

        return (
            <div>
                <Button onClick={ this.createNewList.bind(this) } style={{ margin: '10px 2px' }} type="primary" icon="plus">
                    { _("New List") }
                </Button>

                <div style={{ overflow: 'auto', borderTop: '1px solid #ccc', borderLeft: '1px solid #ccc' }} className="kanban sort">
                    {   localStore.lists.map( (list, i) =>
                        <Column key={ list.id || list.name } index={i} list={list} />
                    )}
                </div>
            </div>
        );
    }
}

@observer class Body extends React.Component {

    constructor(props) {
        super(props);
    }

    render () {

        const { localStore } = this.props

        return (
            <div style={{ padding:'20px 30px', overflow: 'auto', height: '100%' }}>
                <Provider localStore={localStore}>
                    <Tabs tabPosition="left">
                        <TabPane tab={ _("General Settings") } key="1">
                            <General />
                        </TabPane>

                        <TabPane tab={ _("Filter") } key="3">
                            <BasicFilter filter={localStore.filter} />
                        </TabPane>

                        <TabPane tab={ _("Lists") } key="2">
                            <Columns />
                        </TabPane>
                    </Tabs>
                </Provider>
            </div>
        );
    }
}


export default function(ViewStore, DataStore) {

    const localStore = observable({
        name: DataStore.name,
        lists: DataStore.lists.length === 0 ? defaultColumns : deepCopy(DataStore.lists),
        users: deepCopy(DataStore.users),
        filter: deepCopy(DataStore.filter)
    });

    ViewStore.sideBar(null);
    ViewStore.header(<Header localStore={localStore} />);
    ViewStore.body(<Body localStore={localStore} />);
}
