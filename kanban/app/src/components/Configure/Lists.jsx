import React from 'react';
import { observer, inject } from 'mobx-react';
import { DropTarget, DragSource } from 'react-dnd';

import { Input, InputNumber, Form, Button } from 'antd';
const FormItem = Form.Item;

import { SelectStatuses } from 'components/FormItems/Select.jsx'

const dragSource = {
    beginDrag(props, monitor, component) {
        const { list, ViewStore } = props;

        // dragging does not work without hiding
        // antd multi select component!!
        $( ViewStore.node ).find('.statuses-list ul').hide();
        return props;
    },
    endDrag(props, monitor) {
        const { ViewStore } = props;
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

    createNewList = () => {
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
                <Button
                    onClick={ this.createNewList }
                    style={{ margin: '10px 2px' }}
                    type="primary"
                    icon="plus"
                    ghost
                >
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

export default Columns;
