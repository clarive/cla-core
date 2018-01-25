import React from 'react';
import { observer, inject, Provider } from 'mobx-react';
import { observable } from 'mobx';

import { Modal, Alert, Popconfirm, Tabs, Input, Button, Menu, Form } from 'antd';
const ButtonGroup = Button.Group;
const TabPane = Tabs.TabPane;
const confirm = Modal.confirm;

import api from 'lib/api';
import { deepCopy } from 'lib/utils';

import Lists from './Configure/Lists.jsx';
import General from './Configure/General.jsx';
import Filter from './Configure/Filter.jsx';
import Swimlanes, { Edit as EditSwimlane } from './Configure/Swimlanes.jsx';

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

    close (saved) {
        const { localStore, originalValues } = this.props;

        const dontWatch = { currentEditableSwimlane: null, dir: null };

        const origVal = JSON.stringify( { ...originalValues, ...dontWatch } );
        const newVal  = JSON.stringify( { ...localStore, ...dontWatch } );

        const doClose = () => this.props.ViewStore.reset();

        if (!saved && (origVal != newVal)) {
            confirm({
                title: _("Board settings have changed"),
                content: _("Are you sure you want to close without saving any changes?"),
                okText: _("Yes"),
                cancelText: _("No"),
                onOk() {
                   doClose();
                },
                onCancel() {},
            });
        } else {
            doClose();
        }
    }

    save () {
        const { localStore, ViewStore, DataStore } = this.props;
        DataStore.saveBoard(localStore, () => {
            this.close('saved');
            ViewStore.reloadLists();
        })
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
                style={{padding: '9px', border: 0 }}
            >
            { !localStore.swimlaneLivePreview &&
                <Menu.Item key="delete" style={{ cursor: 'default', float:'left', border: 0, padding: 0 }}>
                    { !DataStore.isTempBoard &&
                        <Popconfirm
                            placement="bottomLeft"
                            title={ confirmTxt }
                            onConfirm={ this.deleteBoard.bind(this) }
                            okText= { _("Yes") }
                            cancelText={ _("No") }
                        >
                            <Button icon="delete" type="danger" ghost>{ _("Delete") }</Button>
                        </Popconfirm>
                    }
                </Menu.Item>
            }
            { !localStore.swimlaneLivePreview &&
                <Menu.Item key="save" style={{ float:'right', border: 0, padding: 0 }}>
                    <ButtonGroup>
                        <Button onClick={ () => this.close() }>{ _("Cancel") }</Button>
                        <Button
                            disabled={ hasError }
                            icon="check"
                            onClick={ this.save.bind(this) }
                            type="primary"
                            ghost
                        >
                            { _("Save Changes") }
                        </Button>
                    </ButtonGroup>
                </Menu.Item>
            }

            { localStore.swimlaneLivePreview &&
                <Menu.Item key="note" style={{ float:'right', border: 0, padding: 0, paddingTop: 7 }}>
                    <Alert
                        style={{ paddingTop: 5, paddingBottom: 5 }}
                        message={ _("When done, switch off Live Preview to save changes") }
                        type="warning"
                    />
                </Menu.Item>
            }
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
        const { localStore, ViewStore } = this.props

        return (
            <form className="configure-panel">
                <Provider localStore={localStore}>
                    <Tabs onChange={ this.onTabClick  } tabPosition="left" defaultActiveKey={localStore.dir}>
                        <TabPane tab={ _("General Settings") } key="general">
                            <General />
                        </TabPane>

                        <TabPane tab={ _("Filter") } key="filter">
                            <Filter />
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


export default function(ViewStore, DataStore, dir = 'general', oldLocal) {

    const fields = [];

    const localStore = oldLocal || observable({
        name: DataStore.name,
        lists: DataStore.lists.length === 0 ? defaultColumns : deepCopy(DataStore.lists),
        users: deepCopy(DataStore.users),
        groups: deepCopy(DataStore.groups),
        filter: deepCopy(DataStore.filter),
        swimlanes: deepCopy(DataStore.swimlanesSettings),
        currentEditableSwimlane: null,
        swimlaneLivePreview: false,
        dir: dir,
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

    ViewStore.sideBar(localStore.sideBar || null);
    delete localStore.sideBar;

    const originalValues = deepCopy( localStore );

    ViewStore.header(<Header originalValues={originalValues} localStore={localStore} />);
    ViewStore.body(<Body localStore={localStore} />);
}
