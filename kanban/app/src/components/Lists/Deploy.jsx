import React from 'react';
import { observer, inject } from 'mobx-react';
import { DragSource, DropTarget } from 'react-dnd';
import Job from './Job.jsx';


const ListTarget = {
    drop(props, monitor, component ) {
        const source = monitor.getItem();
        return {
            type: 'deploy',
            deploy: component.deploy,
            from: source,
            to: source
        };
    },

    canDrop (props, monitor) {
        const sourceObj = monitor.getItem();
        return true;
    }
}

@inject("ViewStore")
@inject("DataStore")
@DropTarget("card", ListTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
})) @observer class Jobs extends React.Component {

    constructor(props) {
        super(props);
    }

    deploy = (card) => {
        this.props.ViewStore.sideBar( <Job cancel={ this.props.cancel } card={card}  job={this.props.job} /> );
    }

    render (){
        const { job, canDrop, isOver, connectDropTarget } = this.props;

        return connectDropTarget(
            <div style={{
                width: '100%',
                padding: '30px',
                margin: '10px 0',
                border: '5px dashed #ccc',
                textAlign: 'center',
                background: isOver ? '#f1ffd8' : '#E6F7FD'
            }}>
                { job.text }
            </div>
        )
    }
}

@observer class Deploy extends React.Component {

    constructor(props) {
        super(props);
    }

    render (){
        const { menu, cancel } = this.props;

        return (
            <div style={{ width: '100%', height: '100%' }}>
                <h1 style={{ marginBottom: '30px', fontSize: '18px' }}>{ _("Deploy To") }</h1>
                {   menu.map( job =>
                    <Jobs cancel={ cancel } key={job.text} job={job} />
                )}
            </div>
        )
    }
}

export default Deploy;
