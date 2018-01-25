import React from 'react';
import { observer, inject } from 'mobx-react';
import { autorunAsync, observable } from 'mobx';

import { DropTarget, DragSource } from 'react-dnd';

import { Switch, Badge, Input, InputNumber, Form, Button, Checkbox, Select, Icon } from 'antd';
const FormItem = Form.Item;
const InputGroup = Input.Group;
const Option = Select.Option;

import { generate as generateId } from "shortid";
import Configure from 'components/Configure.jsx';
import { dynamicSort, deepCopy, isEmpty } from "lib/utils.js";
import store from 'stores/StaticStore';
import { SelectTopic, SelectUsers } from 'components/FormItems/Select.jsx';

const defaultSwimLane = {
    type: '',
    fieldId: '',
    id: '',
    name: '',
    originalName: '',
    default: 0,
    everything: {
        enable: 1,
        position: 'bottom',
        text: _("Everything Else")
    },
    all: 0,
    values: []
};

const getSwimField = (swim) => {
    const id = swim.fieldId;
    return store.fields[id];
}

const isUsersField = (swim) => {
    const field = getSwimField(swim);
    return field.type === 'fieldlet.system.users'
}

const isTopicField = (swim) => {
    const field = getSwimField(swim);
    return field.meta.rel_type === 'topic_topic'
}

const isNumberField = (swim) => {
    const field = getSwimField(swim);
    return field.type === 'fieldlet.number'
}

const isNumber = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

@observer class AddNewValue extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: 1,
            value: "",
            name: "",
        }
    }

    handleChange = (v) => {
        const { swimlane } = this.props;

        if (!v && v !== 0) {
            this.setState({ value: "" })
            return;
        }

        if (swimlane.type === 'fieldlet.number' && !isNumber(v) ) {
            return;
        }

        this.setState({
            value: v
        })
    }

    addValue = () => {
        const { swimlane } = this.props;

        let value = String(this.state.value);
        let name = isUsersField(swimlane) ? store.userById[value].username : value;

        if (typeof this.state.value === 'object') {
            value = this.state.value.key;
            name = this.state.value.label.props.title;
        }

        swimlane.values.push({
            value: value,
            name: name
        })

        this.setState({
            value: "",
            id: this.state.id + 1 // force SelectTopic component update
        })
    }

    componentDidUpdate (prevProps, prevState) {
        const { swimlane } = this.props;
        const prevSwimlane = prevProps.swimlane;

        if (swimlane !== prevSwimlane) {
            this.setState({
                value: "",
                id: this.state.id + 1 // force SelectTopic component update
            })
        }
    }

    render() {
        const { localStore, swimlane } = this.props;

        const field = getSwimField(swimlane);

        const options = [];
        const value = this.state.value;
        const name = isUsersField(swimlane) && value ? store.userById[value].username : value;

        const disableButton = isNumber( this.state.value )  ||
            swimlane.values.findIndex( (v) => v.value == this.state.value ) !== -1 ||
            typeof this.state.value === 'object' ||
            this.state.value.length > 0 ? false : true

        if (field.type === 'fieldlet.pills' || field.type === 'fieldlet.combo') {
            field.options.sort().forEach(function(option) {
                if ( swimlane.values.findIndex( (value) => value.value == option ) === -1 ) {
                    options.push(
                        <Option
                            string={ option }
                            key={ option }
                        >
                            { option }
                        </Option>
                    );
                }
            });
        }

        return (
            <div style={{ maxWidth: '100%', position: 'relative' }}>
                { ( field.type === 'fieldlet.combo' ||
                    field.type === 'fieldlet.pills' ) &&
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        value={ this.state.value }
                        optionFilterProp="string"
                        notFoundContent={ _("Not Found") }
                        onChange={ this.handleChange }
                    >
                        { options }
                    </Select>
                }

                { field.type === 'fieldlet.system.users' &&
                    <SelectUsers
                        showSearch
                        mode="single"
                        value={ this.state.value }
                        optionFilterProp="string"
                        notFoundContent={ _("Not Found") }
                        hideList={ swimlane.values.map( (v) => v.value ) }
                        onChange={ this.handleChange }
                    />
                }

                { field.meta.rel_type === 'topic_topic' &&
                    <SelectTopic
                        key={ this.state.id }
                        labelInValue
                        value={
                            !this.state.value ?
                            { key: '', label: '' } :
                            { key: this.state.value.key, label: this.state.value.label.props.title }
                        }
                        query={ { categories: field.meta.categories, topics: swimlane.values.map( (v) => v.value ) } }
                        onChange={ this.handleChange }
                    />
                }

                { field.type === 'fieldlet.number' &&
                    <InputNumber
                        style={{ width: '100%', padding: 0, margin: 0 }}
                        value={ this.state.value }
                        onChange={this.handleChange}
                    />
                }

                <Button
                    disabled={ disableButton }
                    style={{
                        float: 'right',
                        marginTop: '10px',
                        width: '20%'
                    }}
                    type="primary"
                    icon="plus"
                    onClick={ this.addValue }
                />
            </div>
        )
    }
}


const valDragSource = {
    beginDrag(props, monitor, component) {
        return props;
    }
};

const valDragTarget = {
    hover(props, monitor, component) {
        const { value: dragVal, localStore } = monitor.getItem()
        const { value, swimlane } = props;

        const index = swimlane.values.indexOf(value);
        const dragIndex = swimlane.values.indexOf(dragVal);

        if (index === dragIndex) {
            return;
        }

        swimlane.values.splice( index, 1 );
        swimlane.values.splice( dragIndex, 0, value );
    }
}

@DragSource("values", valDragSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
}))
@DropTarget("values", valDragTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
}))
@observer class SwimValue extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            edit: 0
        }
    }

    updateValueName = (e) => {
        const { value, swimlane, localStore } = this.props;
        value.name = e.target.value;
        localStore.setFieldError(value, isEmpty(value.name) )
    }

    handleDelete = () => {
        const { value, swimlane, localStore } = this.props;
        const index = swimlane.values.indexOf( value );
        swimlane.values.splice( index, 1 );
        localStore.setFieldError(value, false);
    }

    render() {
        const { value, swimlane, connectDragPreview, connectDropTarget, connectDragSource } = this.props;

        const val = isUsersField(swimlane) ?
            store.userById[value.value].username :
            isTopicField(swimlane) ? `#${value.value}` : value.value;

        const validateProps = {
            validateStatus : isEmpty(value.name) ? 'error' : undefined,
            help: isEmpty(value.name) ? _("Swimlane value name can not be empty") : undefined
        }

        return connectDragPreview(connectDropTarget(
            <li>
                <FormItem
                    style={{ marginBottom: 5 }}
                    {...validateProps}
                >
                    <Input
                        onChange={ this.updateValueName }
                        value={ value.name }
                        style={{width: '100%'}}
                        addonBefore={
                            <span>
                                <span
                                    style={{
                                        paddingRight:5,
                                        marginRight: 5,
                                        borderRight: '1px solid #ccc'
                                    }}
                                >
                                    { connectDragSource(
                                        <span>
                                            <Icon
                                                style={{
                                                    cursor: 'move',
                                                    transform: 'rotateZ(90deg)'
                                                }}
                                                type="swap"
                                            />
                                        </span>
                                    )}
                                </span>
                                <Icon
                                    style={{ cursor: 'pointer' }}
                                    type="delete"
                                    onClick={ this.handleDelete }
                                />
                            </span>
                        }

                        addonAfter={
                            <div style={{ width: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                { val }
                            </div>
                        }
                    />
                </FormItem>
            </li>
        ))
    }
}

@inject("ViewStore")
@inject("DataStore")
@observer class Edit extends React.Component {
    constructor(props) {
        super(props);
        this.oldBodyComp = null
    }

    updateName (e) {
        const { swimlane, localStore } = this.props;
        swimlane.name = e.target.value;
        localStore.setFieldError( swimlane, isEmpty( swimlane.name ) );
    }


    updateEverythingText = (e) => {
        this.props.swimlane.everything.text = e.target.value;
    }

    updateEverythingPosition  = (v) => {
        this.props.swimlane.everything.position = v;
    }

    removeTempSwimlanes () {
        const { DataStore } = this.props;
        const index = DataStore.swimlanesSettings.findIndex((swim) => swim.id === 'temp')
        if ( index !== -1 ) {
            DataStore.swimlanesSettings.splice( index, 1 );
        }
    }

    quickView = () => {
        const { swimlane, ViewStore, DataStore } = this.props;

        // create a temporary swimlane
        const tempSwimlane = deepCopy( swimlane );
        tempSwimlane.id = 'temp';

        // make sure to remove previous temp swimlanes
        this.removeTempSwimlanes();

        DataStore.swimlanesSettings.push( tempSwimlane );

        // view main board and update swimlanes
        ViewStore.body(null);
        setTimeout ( () => DataStore.updateSwimLanes('temp') );
    }

    setPreviewMode = (value) => {
        const { localStore, DataStore, ViewStore } = this.props;
        localStore.swimlaneLivePreview = value;

        if (value === true) {
            localStore.sideBar = ViewStore.sideBarComp;
            localStore.dir = 'swimlanes'
            this.quickView();
        } else {
            this.removeTempSwimlanes();
            Configure(ViewStore, DataStore, 'swimlanes', localStore);
            console.log( this.currentSwimlaneId );
            setTimeout ( () => DataStore.updateSwimLanes(this.currentSwimlaneId) );
        }
    }

    componentDidMount () {
        const { swimlane, DataStore, ViewStore, localStore } = this.props;
        this.currentSwimlaneId = DataStore.currentSwimLane ?
            DataStore.currentSwimLane.id : 'no swimlanes';

        // save old oby value
        this.bodyComp = ViewStore.bodyComp;

        let old = JSON.stringify( swimlane );

        this.disposer = setInterval(() => {
            if ( localStore.swimlaneLivePreview ) {

                const newObj = JSON.stringify( localStore.currentEditableSwimlane );

                if (old != newObj) {
                    console.log('new');
                    old = newObj;
                    this.quickView();
                }
            }
        }, 350);
    }

    componentWillUnmount() {
        const { DataStore } = this.props;
        this.removeTempSwimlanes();
        clearInterval( this.disposer );
    }

    render() {
        const { swimlane, localStore } = this.props;

        if ( !getSwimField(swimlane) ) {
            return (<div> field mismatch </div>)
        }

        return (
            <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                <div style={{
                        position: 'absolute',
                        borderBottom: '1px solid #ccc',
                        background: '#fff',
                        padding: 20,
                        width: '100%',
                        zIndex: 999
                    }}
                >
                    <Badge
                        status={ localStore.swimlaneLivePreview ? "processing" : "default" }
                        text={ _("Live Preview") }
                    />
                    <Switch
                        style={{ float: 'right' }}
                        checked={ localStore.swimlaneLivePreview }
                        onChange={ this.setPreviewMode }
                        checkedChildren={<Icon type="check" />}
                        unCheckedChildren={<Icon type="cross" />}
                    />
                </div>

                <div style={{
                        position: 'relative',
                        height: '100%',
                        paddingTop: 65,
                    }}
                >
                    <div style={{
                            position: 'relative',
                            overflow: 'auto',
                            height: '100%',
                            padding: 20,
                            paddingTop: 0,
                        }}
                    >
                    <FormItem label={ _("Swimlane Name") }>
                        <Input
                            onChange={ (e) => this.updateName(e) }
                            value={ swimlane.name }
                            style={{width: '100%'}}
                            addonAfter={
                                <div
                                    style={{
                                        width: '100%',
                                        padding: '0 5px'
                                    }}
                                >
                                    { swimlane.originalName }
                                </div>
                            }
                        />
                    </FormItem>

                    <FormItem>
                        <Checkbox
                            checked ={ swimlane.everything.enable ? true : false }
                            onChange={ (e) => swimlane.everything.enable = e.target.checked ? 1 : 0 }
                        >
                            { _('Show uncategorized topics') }
                        </Checkbox>
                        {  swimlane.everything.enable === 1 &&
                            <div>
                                <InputGroup compact>
                                    <Input
                                        onChange={ this.updateEverythingText }
                                        value={ swimlane.everything.text }
                                        style={{width: '60%'}}
                                    />
                                    <Select
                                        value={ swimlane.everything.position }
                                        onChange={ this.updateEverythingPosition }
                                        style={{ width: '40%' }}
                                    >
                                        <Option value="top">{ _("At Top") }</Option>
                                        <Option value="bottom">{ _("At Bottom") }</Option>
                                    </Select>
                                </InputGroup>
                            </div>
                        }
                    </FormItem>

                    <Select
                        style={{ marginBottom: '15px', width: '100%' }}
                        value={ String(swimlane.all) }
                        onChange={ (v) => swimlane.all = Number(v) }
                    >
                        <Option value="1">{ _('View All Possible Values') }</Option>
                        <Option value="0">{ _('Customize Swimlane Values') }</Option>
                    </Select>

                    {/* custom swimlane values */}
                    { swimlane.all === 0 &&
                        <div>
                            <ul className="swim-values">
                                { swimlane.values.map( (value, i) =>
                                    <SwimValue localStore={localStore} value={value} swimlane={ swimlane } key={ i } />
                                )}
                            </ul>
                            <FormItem style={{ marginTop: '10px' }} label={ _("Add New Value") }>
                                <AddNewValue swimlane={swimlane} />
                            </FormItem>
                        </div>
                    }
                    </div>
                </div>
            </div>
        )
    }
}


const swimDragSource = {
    beginDrag(props, monitor, component) {
        return props;
    }
};

const swimDragTarget = {
    hover(props, monitor, component) {
        const { swimlane: dragSwim, localStore } = monitor.getItem()
        const { swimlane } = props;

        const index = localStore.swimlanes.indexOf(swimlane);
        const dragIndex = localStore.swimlanes.indexOf(dragSwim);

        if (index === dragIndex) {
            return;
        }

        localStore.swimlanes.splice( index, 1 );
        localStore.swimlanes.splice( dragIndex, 0, swimlane );
    }
}

@inject("ViewStore")
@inject("DataStore")
@inject("localStore")
@DragSource("swimlanes", swimDragSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
}))
@DropTarget("swimlanes", swimDragTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
}))
@observer class SwimLane extends React.Component {

    editSwimlane = () => {
        const { swimlane, localStore, ViewStore } = this.props;
        localStore.currentEditableSwimlane = swimlane;
        ViewStore.sideBar(<Edit style={{ padding: 0 }} localStore={localStore} swimlane={swimlane} />);
    }

    handleDelete = () => {
        const { swimlane, localStore, DataStore, ViewStore } = this.props;
        const index = localStore.swimlanes.indexOf( swimlane );

        if (DataStore.currentSwimlane === swimlane) {
            DataStore.currentSwimlane = {};
        }

        if (localStore.currentEditableSwimlane === swimlane) {
            localStore.currentEditableSwimlane = null;
            ViewStore.sideBar(null);
        }

        localStore.swimlanes.splice( index, 1 );

        // remove all errors set for this swimlane
        swimlane.values.forEach((value) => {
            localStore.setFieldError(value, false);
        });
        localStore.setFieldError( swimlane, false );
    }

    setName = (e) => {
        const { localStore, swimlane } = this.props;
        swimlane.name = e.target.value;
        localStore.setFieldError( swimlane, isEmpty( swimlane.name ) );
    }

    setDefaultView = (e) => {
        const { swimlane, localStore } = this.props;

        localStore.swimlanes.forEach( (swim) => {
            if (swim !== swimlane) {
                swim.default = 0;
            } else {
                swim.default = swim.default ? 0 : 1
            }
        })
    }

    render() {
        const { swimlane, localStore, connectDragSource, connectDropTarget, connectDragPreview } = this.props;

        const validateProps = {
            validateStatus : isEmpty(swimlane.name) ? 'error' : undefined,
            help: isEmpty(swimlane.name) ? _("Swimlane name can not be empty") : undefined
        }

        return connectDragPreview(connectDropTarget(
            <li>
                <FormItem
                    style={{ marginBottom: '5px' }}
                    {...validateProps}
                >

                    <Input
                        style={{width: '100%'}}
                        size="large"
                        disabled={ localStore.currentEditableSwimlane === swimlane ? false : true }
                        value={ swimlane.name }
                        onChange={ this.setName }
                        addonBefore={ connectDragSource(
                            <span>
                                <Icon
                                    style={{
                                        cursor: 'move',
                                        transform: 'rotateZ(90deg)'
                                    }}
                                    type="swap"
                                />
                            </span>
                        )}

                        addonAfter={
                            <span>
                                { swimlane.default === 1 &&
                                    <span
                                        style={{
                                            marginRight: 5,
                                            paddingRight: 5
                                        }}
                                    >
                                        { _("Default View") }
                                    </span>
                                }

                                <span
                                    style={{
                                        paddingRight:5,
                                        marginRight: 5,
                                        borderRight: '1px solid #ccc'
                                    }}
                                >
                                    <Checkbox
                                        checked ={ swimlane.default ? true : false }
                                        onChange={ this.setDefaultView }
                                    >
                                    </Checkbox>
                                </span>
                                <span
                                    style={{
                                        paddingRight:5,
                                        marginRight: 5,
                                        borderRight: '1px solid #ccc'
                                    }}
                                >
                                    <Icon
                                        type="edit"
                                        style={{ cursor: 'pointer', fontSize: '14px' }}
                                        onClick={ this.editSwimlane }
                                    />
                                </span>
                                <Icon
                                    type="delete"
                                    style={{ cursor: 'pointer', fontSize: '14px' }}
                                    onClick={ this.handleDelete }
                                />
                            </span>
                        }
                    />

                </FormItem>
            </li>
        ))
    }
}


@inject("ViewStore")
@inject("localStore")
@observer class SwimLanes extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value : ""
        }
    }

    handleChange = (v) => {
        this.setState({ value: v })
    }

    addNewSwimlane = (e) => {
        const { localStore, ViewStore } = this.props;
        const value = this.state.value;
        const field = store.fields[value];
        const swim = { ...defaultSwimLane,
            id: generateId(),
            type: field.type,
            name: field.name,
            originalName: field.name,
            fieldId: field.name
        };

        localStore.swimlanes.push( swim );
        this.setState({ value: "" });

        const newSwimLane = localStore.swimlanes[ localStore.swimlanes.length - 1 ];
        localStore.currentEditableSwimlane = newSwimLane;
        ViewStore.sideBar(<Edit style={{ padding: 0 }} localStore={localStore} swimlane={newSwimLane} />);
    }

    render() {
        const { localStore } = this.props;
        const options = [];

        Object.keys(store.fields).sort().forEach( (key) => {
            const field = store.fields[key];
            options.push(
                <Option
                    string={ key + ' ' + key.toLowerCase() }
                    key={ key }
                >
                    { key }
                </Option>
            );
        });

        return (
            <div>
                <FormItem label={ _("Swimlanes") }>
                    <ul>
                        { localStore.swimlanes.map( (swimlane, i) =>
                            <SwimLane form={this.props.form} swimlane={ swimlane } key={ swimlane.id } />
                        )}
                    </ul>
                </FormItem>

                <FormItem>
                    <InputGroup compact>
                        <Select
                            style={{ width: '80%' }}
                            value={ this.state.value || _("Add New Swimlane From Field") }
                            showSearch
                            optionFilterProp="string"
                            notFoundContent={ _("Not Found") }
                            onChange={ this.handleChange }
                        >
                            { options }
                        </Select>

                        <Button
                            disabled={ this.state.value.length > 0 ? false : true }
                            style={{
                                width: '20%'
                            }}
                            type="primary"
                            icon="plus"
                            onClick={ this.addNewSwimlane }
                        />
                    </InputGroup>
                </FormItem>
            </div>
        )
    }
}

export default SwimLanes;
export { Edit }
