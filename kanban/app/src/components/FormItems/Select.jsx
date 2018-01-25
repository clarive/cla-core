import React from "react"
import { inject, observer } from "mobx-react"
import { observable, action } from 'mobx';
import { Select, Pagination, Spin } from 'antd';
const Option = Select.Option;

import store from "stores/StaticStore";
import { dynamicSort, debounce } from "lib/utils.js";
import api from 'lib/api';

const SelectList = observer( (props) => {
    const { DataStore } = props;

    return <Select
        optionFilterProp="string"
        allowClear={true}
        mode="multiple"
        notFoundContent={ _("Not Found") }
        placeholder={ _("Please select") }
        style={{width: '100%', maxWidth: '100%' }}
        {...props}
    >
        { props.children }
    </Select>
})


const SelectCategories = observer( (props) => {

    const categories = [];
    store.categories.sort(dynamicSort('name')).forEach(function(cat) {
        categories.push(
            <Option title={cat.name} string={ cat.name + cat.name.toLowerCase() } key={cat.id}>
                <span id="boot">
                    <span className={`label category-label category-${cat.id}`}>
                        { cat.name }
                    </span>
                </span>
            </Option>
        );
    });

    return <SelectList
        className="category-selector"
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
    const hideList   = props.hideList || [];

    const users = [];
    store.users.sort(dynamicSort('username')).forEach(function(user) {
        if ( hideList.indexOf(user.mid) === -1 ) {
            users.push(
                <Option string={ user.username + user.realname } key={ user[valueField] }>
                    { user.username }  { user.realname.length > 0 && `( ${user.realname} )` }
                </Option>
            )
        }
    });

    return <SelectList
        {...props}
    >
        { users }
    </SelectList>
})


@observer class SelectGroups extends React.Component {
    constructor(props) {
        super(props);
    }

    @observable request = {
        loading: false,
        data: []
    };

    componentDidMount () {
        this.request.loading = true;
        api.post('/usergroup/list', {
            only_data: 1
        }).done( (data) => {
            this.request.loading = false;
            this.request.data.replace( data || [] );
        })
    }

    render() {

        const options = this.request.data.map( group =>
            <Option string={ group.groupname + group.groupname.toLowerCase() } key={group.mid}>
                { group.groupname }
            </Option>
        )

        return (
            <SelectList
                showSearch
                notFoundContent= {
                    this.request.loading ?
                    <Spin
                        className="center"
                        style={{
                            width: '100%',
                            textAlign: 'center'
                        }}
                    /> : _("Not Found")
                }
                {...this.props}
            >
                { options }
            </SelectList>
        )
    }
}


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


@observer class SelectTopic extends React.Component {
    constructor(props) {
        super(props);
    }

    @observable data = []

    @observable request = {
        current: 1,
        total: 0,
        loading: false,
        searchText: ''
    };

    @action debounceFetch = debounce( () => {
        this.request.loading = true;
        api.post('board/search_topics', {
            page: this.request.current,
            text: this.request.searchText,
            query: JSON.stringify(this.props.query)
        }).done( (data) => {
            this.request.loading = false;
            this.request.total = data.total;
            this.data.replace( data.topics || [] );
        })
    }, 300);

    navigate = (page, count) => {
        this.request.current = page;
        this.debounceFetch();
    }

    fetchTopics = (value) => {
        this.request.searchText = value || '';
        this.navigate(1);
    }

    componentDidMount () {
        this.navigate(1);
    }

    render() {

        const options = this.data.map( topic =>
            <Option key={topic.mid}>
                <span
                    title={topic.title}
                    id="boot"
                >
                    <span className={`label category-label category-${topic.id_category} with-acronym`}>
                        { ` #${topic.mid} - ${topic.title}`}
                    </span>
                </span>
            </Option>
        )

        if ( this.request.total > 5 ) {
            options.push(
                <Option key={ Math.random() } disabled={true}>
                    <div className="center"
                        style={{
                            width: '100%',
                            textAlign: 'center'
                        }}
                    >
                        <Pagination
                            key={ this.request.current }
                            simple
                            size="small"
                            onChange={ this.navigate }
                            total={ this.request.total }
                            defaultCurrent={ this.request.current }
                            pageSize={5}
                        />
                    </div>
                </Option>
            )
        }

        return (
            <SelectList
                showSearch
                mode="single"
                notFoundContent= {
                    this.request.loading ?
                    <Spin
                        className="center"
                        style={{
                            width: '100%',
                            textAlign: 'center'
                        }}
                    /> : _("Not Found")
                }
                onSearch={ this.fetchTopics }
                filterOption={ false }
                {...this.props}
            >
                { options }
            </SelectList>
        )
    }
}

export { SelectList, SelectCategories, SelectLabels, SelectUsers, SelectGroups, SelectProjects, SelectStatuses, SelectTopic }
