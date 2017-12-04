import React from 'react';
import { observer, inject } from 'mobx-react';
import { DragSource, DropTarget } from 'react-dnd';

import store from "stores/StaticStore.js";

const StatusTarget = {
    drop(props, monitor, component ) {
        props.card.changeStatusTo = props.status;
    }
}


@DropTarget("card", StatusTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
})) @observer class Status extends React.Component {

    constructor(props) {
        super(props);
    }

    render (){
        const { list, canDrop, isOver, connectDropTarget, height, status } = this.props;

        return connectDropTarget(
            <div style={{
                width: '100%',
                padding: `${height/2}px 0`,
                margin: '5px 0',
                borderTop: '5px dashed #ccc',
                borderBottom: '5px dashed #ccc',
                textAlign: 'center',
                background: isOver ? '#f1ffd8' : '#E6F7FD'
            }}>
                { store.statusById[status].name }
            </div>
        )
    }
}

@inject("ViewStore")
@observer class StatusChange extends React.Component {

    constructor(props) {
        super(props);
    }

    render (){
        const { ViewStore, statuses, card } = this.props;
        const dargCardNode = $( ViewStore.node ).find('.draggable');
        const height = dargCardNode.height() + 5;

        return (
            <div>
                { statuses.map( (status, i) =>
                    <Status key={i} card={card} status={status} height={height} />
                )}
            </div>
        )
    }
}

export default StatusChange;
