import React from 'react';
import { observer, inject, Provider } from 'mobx-react';
import { observable } from 'mobx';

import { Alert, Popconfirm, Tabs, Input, Button, Menu, Form } from 'antd';
const ButtonGroup = Button.Group;
const TabPane = Tabs.TabPane;

import api from 'lib/api';
import { deepCopy } from 'lib/utils';

import Lists from './Configure/Lists.jsx';
import General from './Configure/General.jsx';
import Swimlanes, { Edit as EditSwimlane } from './Configure/Swimlanes.jsx';
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
            users: localStore.users,
            swimlanes: localStore.swimlanes
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
        const { DataStore, localStore } = this.props;
        const confirmTxt = _("Are you sure you want to delete this board?");

        const hasError = localStore.hasError;

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
                        <Button
                            disabled={ hasError }
                            icon="check"
                            type="primary"
                            onClick={ this.save.bind(this) }
                        >
                            { _("Save") }
                        </Button>
                    </ButtonGroup>
                </Menu.Item>
            </Menu>
        );
    }
}

@inject("ViewStore")
@observer class Body extends React.Component {

    constructor(props) {
        super(props);
    }

    onTabClick = (key) => {
        const { localStore, ViewStore } = this.props;

        ViewStore.sideBar(null);

        if (key === 'swimlanes') {
            if (localStore.currentEditableSwimlane) {
                ViewStore.sideBar(
                    <EditSwimlane localStore={localStore} swimlane={localStore.currentEditableSwimlane} />
                );
            }
        }
    }

    render () {
        const { localStore, dir, ViewStore } = this.props

        return (
            <form className="configure-panel">
                <Provider localStore={localStore}>
                    <Tabs onChange={ this.onTabClick  } tabPosition="left" defaultActiveKey={dir}>
                        <TabPane tab={ _("General Settings") } key="general">
                            <General />
                        </TabPane>

                        <TabPane tab={ _("Filter") } key="filter">
                            <BasicFilter filter={localStore.filter} />
                        </TabPane>

                        <TabPane tab={ _("Lists") } key="lists">
                            <Lists />
                        </TabPane>

                        <TabPane tab={ _("Swimlanes") } key="swimlanes">
                            <Swimlanes />
                        </TabPane>
                    </Tabs>
                </Provider>
            </form>
        );
    }
}


export default function(ViewStore, DataStore, dir = 'general') {

    const fields = [];

    const localStore = observable({
        name: DataStore.name,
        lists: DataStore.lists.length === 0 ? defaultColumns : deepCopy(DataStore.lists),
        users: deepCopy(DataStore.users),
        filter: deepCopy(DataStore.filter),
        swimlanes: deepCopy(DataStore.swimlanesSettings),
        currentEditableSwimlane: null,
        hasError: false,
        setFieldError (item, value) {
            const index = fields.findIndex( (field) => field.field === item );
            if (index !== -1) {
                fields[index].error = value;
            } else {
                fields.push({ field: item, error: value });
            }

            this.hasError = fields.find( (field) => field.error === true ) ? true : false;
        }
    });

    ViewStore.sideBar(null);

    ViewStore.header(<Header localStore={localStore} />);
    ViewStore.body(<Body localStore={localStore} dir={dir} />);
}
