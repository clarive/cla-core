import React from 'react';
import { observer } from 'mobx-react';
import moment from 'moment';

import { Input, Form, Select, Icon, DatePicker } from 'antd';
const FormItem = Form.Item;

import api from 'lib/api';
import { deepCopy } from 'lib/utils';
import store from 'stores/StaticStore';

import {
    SelectList,
    SelectCategories,
    SelectLabels,
    SelectUsers,
    SelectProjects,
    SelectStatuses
} from 'components/FormItems/Select.jsx'


const momentIsoDateFormat = (dateString) => {
    const dateFormat = store.prefs.dateFormat;
    const isoDateFormat = 'YYYY-MM-DD';

    if (!dateString) return undefined;

    if ( dateString.match(/^\d{4}-\d{2}-\d{2}$/) ) {
        return moment( dateString, isoDateFormat );
    } else {
        return moment( dateString, dateFormat );
    }
};

@observer class BasicFilter extends React.Component {
    constructor(props) {
        super(props);
    }

    handleChange (type, value) {
        this.props.filter[type] = value;
    }

    setDate (type, when, mom, date) {
        this.props.filter[type][ when === 'from' ? 0 : 1 ] = mom ? mom.format("YYYY-MM-DD") : "";
    }

    render() {
        const { filter } = this.props;

        const selectedCats = filter.categories.toJS();
        const selectedProjects = filter.projects.toJS();
        const selectedLabels = filter.labels.toJS();
        const selectedStatuses = filter.statuses.toJS();
        const createdOn  = filter.createdOn || ["",""];
        const modifiedOn = filter.modifiedOn || ["",""];

        const modifiedFrom =  momentIsoDateFormat( modifiedOn[0] );
        const modifiedTo   =  momentIsoDateFormat( modifiedOn[1] );
        const createdFrom  =  momentIsoDateFormat( createdOn[0] );
        const createdTo    =  momentIsoDateFormat( createdOn[1] );

        const dateFormat = store.prefs.dateFormat;

        return (
            <Form layout="vertical">
                <FormItem label={ _("Projects") }>
                    <SelectProjects
                        defaultValue={selectedProjects}
                        onChange={ (v) => this.handleChange('projects', v) }
                    />
                </FormItem>
                <FormItem label={ _("Categories") }>
                    <SelectCategories
                        defaultValue={selectedCats}
                        onChange={ (v) => this.handleChange('categories', v) }
                    />
                </FormItem>

                <FormItem label={ _("Statuses") }>
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

                <FormItem label={ _("Created On") }>
                    <DatePicker
                        style={{ margin: '0 5px 5px 0' }}
                        placeholder={ _("From") }
                        defaultValue={ createdFrom }
                        onChange={ (m, v) => this.setDate('createdOn', 'from', m, v ) }
                        format={ dateFormat }
                    />
                    <DatePicker
                        placeholder={ _("To") }
                        defaultValue={ createdTo }
                        onChange={ (m, v) => this.setDate('createdOn', 'to', m, v ) }
                        format={ dateFormat }
                    />
                </FormItem>

                <FormItem label={ _("Modified On") }>
                    <DatePicker
                        style={{ margin: '0 5px 5px 0' }}
                        placeholder={ _("From") }
                        defaultValue={ modifiedFrom }
                        onChange={ (m, v) => this.setDate('modifiedOn', 'from', m, v ) }
                        format={ dateFormat }
                    />
                    <DatePicker
                        placeholder={ _("To") }
                        defaultValue={ modifiedTo }
                        onChange={ (m, v) => this.setDate('modifiedOn', 'to', m, v ) }
                        format={ dateFormat }
                    />
                </FormItem>
            </Form>
        )
    }
}

export default BasicFilter;
