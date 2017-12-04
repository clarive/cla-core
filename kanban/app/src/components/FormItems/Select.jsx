import React from "react"
import { inject, observer } from "mobx-react"
import { Select } from 'antd';
const Option = Select.Option;

import store from "stores/StaticStore";
import { dynamicSort } from "lib/utils.js";

const SelectList = observer( (props) => {
    const { DataStore } = props;

    return <Select
        optionFilterProp="string"
        allowClear={true}
        mode="multiple"
        size="large"
        notFoundContent={ _("Not Found") }
        placeholder={ _("Please select") }
        style={{width: '100%'}}
        {...props}
    >
        { props.children }
    </Select>
})


const SelectCategories = observer( (props) => {

    const categories = [];
    store.categories.sort(dynamicSort('name')).forEach(function(cat) {
        categories.push(<Option string={ cat.name + cat.name.toLowerCase() } key={cat.id}>{ cat.name }</Option>);
    });

    return <SelectList
        {...props}
    >
        { categories }
    </SelectList>
})


const SelectLabels = observer( (props) => {

    const labels = [];
    store.labels.sort(dynamicSort('name')).forEach(function(label) {
        labels.push(<Option string={ label.name + label.name.toLowerCase() } key={label.id}>{ label.name }</Option>);
    });

    return <SelectList
        {...props}
    >
        { labels }
    </SelectList>
})


const SelectUsers = observer( (props) => {

    const valueField = props.valueField || "mid";

    const users = [];
    store.users.sort(dynamicSort('username')).forEach(function(user) {
        users.push(<Option string={ user.username + user.realname } key={ user[valueField] }>{ user.username } ( {user.realname} )</Option>);
    });

    return <SelectList
        {...props}
    >
        { users }
    </SelectList>
})


const SelectProjects = observer( (props) => {

    const projects = [];
    store.projects.sort(dynamicSort('name')).forEach(function(project) {
        projects.push(<Option string={ project.name.toLowerCase() } key={project.mid}>{ project.name }</Option>);
    });

    return <SelectList
        {...props}
    >
        { projects }
    </SelectList>
})

const SelectStatuses = observer( (props) => {

    const statuses = [];
    store.statuses.sort(dynamicSort('name')).forEach(function(status) {
        statuses.push(<Option string={status.name + status.name.toLowerCase()} key={status.id_status}>{ status.name }</Option>);
    });

    return <SelectList
        {...props}
    >
        { statuses }
    </SelectList>
})


export { SelectList, SelectCategories, SelectLabels, SelectUsers, SelectProjects, SelectStatuses }
