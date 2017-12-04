
import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, computed } from 'mobx';

// antd
import { Checkbox, Icon, Select, Button, Form, InputNumber } from 'antd';
const Option = Select.Option;
const FormItem = Form.Item;
const CheckboxGroup = Checkbox.Group;

// app
import store from 'stores/StaticStore';


@inject("DataStore")
@observer class View extends React.Component {

    constructor(props) {
        super(props);
    }

    @computed get hasEmptyLists () {
        return this.props.DataStore.lists.find( (list) => list.total === 0 ) ? true : false
    }

    @computed get collapsedLists () {
        const { lists } = this.props.DataStore;
        let collapsed = 0;
        let emptyCollapsed = 0;
        lists.forEach( (list) => {
            if ( list.collapsed ) {
                collapsed++;
                if (list.total === 0) {
                    emptyCollapsed++;
                }
            } else if (list.total === 0) {
                emptyCollapsed--;
            }
        })

        if ( collapsed > 0 ) {
            if ( emptyCollapsed === collapsed ) return 'empty'
            else if ( collapsed === lists.length ) return 'all'
        }
        return '';
    }

    @computed get allSwimlanesCollapsed () {
        const swimlanes = this.props.DataStore.swimLanes || [];
        const collapsed = swimlanes.find( (swim) => swim.collapsed === 1 );
        return collapsed ? collapsed.length === swimlanes.lenght : false;
    }

    collapseAllLists = (e) => {
        this.props.DataStore.lists.forEach( (list) => {
            list.collapsed = e.target.checked ? 1 : 0;
        });
    }

    collapseEmptyLists = (e) => {
        this.props.DataStore.lists.map( (list) => {
            if (!list.total) list.collapsed = e.target.checked ? 1 : 0;
            else list.collapsed = 0;
        });
    }

    collapseAllSwimLanes = (e) => {
        this.props.DataStore.swimLanes.forEach( (swim) => {
            swim.collapsed = e.target.checked ? 1 : 0;
        });
    }

    handleCardsNum = (v) => {
        this.props.DataStore.cardsPerList = v;
    }

    render() {

        const DataStore = this.props.DataStore;

        return (
            <div>
                <div style={{ overflow: 'hidden' }}>
                    <h2 style={{ float: 'left'}}>{ _("Quick View") }</h2>
                </div>

                <br />

                <Form layout="vertical">
                    { DataStore.isDynamicBoard &&
                        <FormItem>
                            <div>
                                <div style={{ borderBottom: '1px solid #E9E9E9' }}>
                                    { _("Cards Per List") }
                                </div>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={1}
                                    max={250}
                                    defaultValue={DataStore.cardsPerList}
                                    onChange={this.handleCardsNum}
                                />
                          </div>
                        </FormItem>
                    }
                    <FormItem>
                        <div>
                        <div style={{ borderBottom: '1px solid #E9E9E9' }}>
                            <Checkbox
                                disabled={ !this.hasEmptyLists ? true : false }
                                checked={ this.collapsedLists === 'empty' }
                                onChange={this.collapseEmptyLists}
                            >
                                { _("Collapse Empty Lists") }
                            </Checkbox>
                        </div>
                      </div>
                    </FormItem>

                    <FormItem>
                        <div>
                        <div style={{ borderBottom: '1px solid #E9E9E9' }}>
                            <Checkbox
                                checked={ this.collapsedLists === 'all' }
                                onChange={this.collapseAllLists}
                            >
                                { _("Collapse All Lists") }
                            </Checkbox>
                        </div>
                      </div>
                    </FormItem>

                    <FormItem>
                        <div>
                        <div style={{ borderBottom: '1px solid #E9E9E9' }}>
                            <Checkbox
                                disabled={ DataStore.noSwimlanes ? true : false }
                                checked={ this.allSwimlanesCollapsed }
                                onChange={this.collapseAllSwimLanes}
                            >
                                { _("Collapse All SwimLanes") }
                            </Checkbox>
                        </div>
                      </div>
                    </FormItem>
                </Form>
            </div>
        )
    }
}

export default View;
