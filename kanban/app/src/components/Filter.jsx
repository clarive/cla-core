import React from 'react';
import { observer, inject } from 'mobx-react';

import { Icon, Select, Button, Form, InputNumber } from 'antd';
const Option = Select.Option;
const FormItem = Form.Item;

import api from 'lib/api';
import store from 'stores/StaticStore';

import {
    SelectList,
    SelectCategories,
    SelectLabels,
    SelectUsers,
    SelectProjects,
    SelectStatuses
} from 'components/FormItems/Select.jsx'

@inject("ViewStore")
@inject("DataStore")
@observer class Filter extends React.Component {

    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange (type, val) {
        const { DataStore } = this.props;
        DataStore.quickFilter[type] = val;
        setTimeout ( () => { DataStore.updateSwimLanes() }, 100 );
    }

    close () {
        this.props.ViewStore.sideBar(null);
    }

    render() {
        const { DataStore } = this.props;

        const selectedCats = DataStore.quickFilter.categories.toJS();
        const selectedLabels = DataStore.quickFilter.labels.toJS();
        const selectedStatuses = DataStore.quickFilter.statuses.toJS();

        const selectedAssignedTo = DataStore.quickFilter.assignedTo.toJS();
        const selectedCreatedBy = DataStore.quickFilter.createdBy.toJS();

        return (

            <div key={ DataStore.hasQuickFilter ? 1 : 2 }>
                <div style={{ overflow: 'hidden' }}>

                    <div style={{ float: 'left', paddingTop: '3px', paddingRight: '10px' }}>
                        <Button size="small" onClick={ this.close.bind(this) }>
                        <Icon type="close" />
                        </Button>
                    </div>

                    <h2 style={{ float: 'left' }}>{ _('Quick Filters') }</h2>
                    <div style={{ float: 'right' }}>
                        {
                            !!DataStore.hasQuickFilter && <Button onClick={ () => DataStore.clearQuickFilters() }>
                                <Icon type="minus" /> { _("Clear") }
                            </Button>
                        }
                    </div>
                </div>

                <br />
                <Form layout="vertical">
                    <FormItem label={ _("Categories") } >
                        <SelectCategories
                            defaultValue={selectedCats}
                            onChange={ (v) => this.handleChange('categories', v) }
                        />
                    </FormItem>

                    <FormItem label={ _("Statuses") } >
                        <SelectStatuses
                            defaultValue={selectedStatuses}
                            onChange={ (v) => this.handleChange('statuses', v) }
                        />
                    </FormItem>

                    <FormItem label={ _("Labels") }>
                        <SelectLabels
                            defaultValue={selectedLabels}
                            onChange={ (v) => this.handleChange('labels', v) }
                        />
                    </FormItem>

                    <FormItem label={ _("Created By") }>
                        <SelectUsers
                            valueField="username"
                            defaultValue={selectedCreatedBy}
                            onChange={ (v) => this.handleChange('createdBy', v) }
                        />
                    </FormItem>

                    <FormItem label={ _("Assigned To") }>
                       <SelectUsers
                            defaultValue={selectedAssignedTo}
                            onChange={ (v) => this.handleChange('assignedTo', v) }
                        />
                    </FormItem>
                </Form>
            </div>
        )
    }
}

export default Filter;
