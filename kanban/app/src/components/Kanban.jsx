import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';

import api from 'lib/api';
import store from 'stores/StaticStore';

import { Popover, Select, Button, Menu, Icon } from 'antd';
const Option = Select.Option;
const ButtonGroup = Button.Group;

import Configure from 'components/Configure.jsx';
import View from 'components/View.jsx';
import Filter from 'components/Filter.jsx';
import Plan from 'components/Plan.jsx';

import KanbanLists from 'components/Lists.jsx';
import Layout from 'components/Layout/Layout.jsx';

@inject("ViewStore")
@inject("DataStore")
@observer class Header extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.filterOn = false;
    }

    showFilter () {
        this.filterOn = !this.filterOn ? true : false;
        this.props.ViewStore.sideBar( this.filterOn ? <Filter data={this.props.data} /> : null );
    }

    handleChange (v) {
        if (!v) {
            const { ViewStore, DataStore } = this.props;
            Configure(ViewStore, DataStore, 'swimlanes');
        } else {
            this.props.DataStore.updateSwimLanes(v);
        }
    }

    render() {
        const { ViewStore, DataStore } = this.props;

        const seperatorStype =  { borderTop: '1px solid #eee', padding: 0 }

        return (
            <Menu
                mode="horizontal"
                defaultSelectedKeys={[]}
                style={{padding: '7px', border: 0 }}
            >

                <Menu.Item key="mail" style={{ float:'right', border: 0 }}>
                    <ButtonGroup>
                        <Button
                            onClick={ this.showFilter.bind(this) }
                            style={{ margin: '0 2px', paddingLeft: '10px' }} type="primary">
                            <Icon type={ !DataStore.hasQuickFilter ? "filter" : "check" } />
                            { _("Filter") }
                            { !!DataStore.hasQuickFilter && <span> ( { DataStore.hasQuickFilter } ) </span>}
                        </Button>
                    </ButtonGroup>

                    {   !!DataStore.isAdmin &&
                        <Button
                        icon="edit"
                        onClick={ () => Configure(ViewStore, DataStore) }
                        style={{ margin: '0 2px', paddingLeft: '10px' }} type="primary">{ _("Configure") }</Button>
                    }
                </Menu.Item>

                { !!DataStore.isAdmin && DataStore.isStaticBoard &&
                    <Menu.Item key="backlog" style={{ float:'left', border: 0 }}>
                        <Button
                            onClick={ () => Plan(ViewStore, DataStore) }
                            type="primary">{ _("Plan Mode") }
                        </Button>
                    </Menu.Item>
                }

                <Menu.Item key="app" style={{ width: '250px', border: 0 }}>
                    <Select
                        showSearch
                        optionFilterProp="string"
                        size="large"
                        style={{ margin: '5px', width: '100%' }}
                        value={ DataStore.currentSwimLane.id ? DataStore.currentSwimLane.id : 'no swimlanes' }
                        onChange={this.handleChange}
                    >
                        <Option value="no swimlanes">{ _("No Swimlanes") }</Option>
                        <Option style={ seperatorStype } value={'sep-1' + Math.random() } disabled={true} ></Option>
                        <Option value="creator">{ _("Creator") }</Option>
                        <Option value="categories">{ _("Categories") }</Option>
                        <Option style={ seperatorStype } value={'sep-1' + Math.random() } disabled={true} ></Option>

                        { DataStore.customSwimLanes.map( (swim, i) =>
                            <Option
                                string={ swim.name + swim.name.toLowerCase() }
                                key={ swim.id }
                            >
                                { swim.name }
                            </Option>
                        )}

                        <Option style={ seperatorStype } value={'sep-1' + Math.random() } disabled={true} ></Option>
                        <Option style={{ background: '#eee', color: '#888', textAlign: 'center' }} value="">{ _("Configure Swimlanes") }</Option>
                    </Select>
                    <Popover placement="bottom" content={<View />} trigger="click">
                        <Button size="large">
                        <Icon type="bars" />{ _("View") }
                        </Button>
                    </Popover>
                </Menu.Item>
            </Menu>
        );
    }
}


@inject("ViewStore")
@inject("DataStore")
@observer class Kanban extends React.Component {

    @observable loaded = false;

    constructor(props) {
        super(props);
    }

    componentDidMount (){
        this.props.ViewStore.loading();
        store.data( () => {
            this.loaded = true;
            this.props.ViewStore.loading(false);
        });
    }

    render() {
        const { id, ViewStore, DataStore } = this.props;
        const nid = DataStore.id || id;
        return (
            <Layout defaultHeader={<Header />}>
            { this.loaded &&
                <KanbanLists key={ViewStore.reload} board={nid} />
            }
            </Layout>
        );
    }
}

export default Kanban;
