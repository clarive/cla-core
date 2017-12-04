import React from 'react';
import { render } from 'react-dom';

import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';
import { DragSource, DropTarget } from 'react-dnd';

import { Modal, Select, message } from 'antd';
const Option = Select.Option;

import api from 'lib/api';

import store from 'stores/StaticStore';

import Deploy from "./Deploy.jsx";
import StatusChange from './StatusChange.jsx';

import { CategoryLabel } from "components/UI.jsx";
import { deepCopy } from 'lib/utils.js';

@observer class CardView extends React.Component {

    constructor(props) {
        super(props);
    }

    render (){
        return (
            <div>
                <div>{ this.props.card.mid }</div>
                <div>{ this.props.card.title }</div>
            </div>
        )
    }
}


const StatusModal = observer( (props) => {

    const statuses = [];
    let selectedStatus = props.statuses[0];

    props.statuses.forEach(function(id) {
        const status = store.statusById[id];
        if ( status.id_status === props.status ) selectedStatus = props.status;
        statuses.push(<Option value={status.id_status} key={status.id_status}>{ status.name }</Option>);
    });

    const handleChange = (v) => {
        selectedStatus = v;
    }

    return <Modal
        title={ _("Select a Status") }
        visible={true}
        onOk={ () => props.updateCard(selectedStatus) }
        onCancel={props.cancel}
        okText={ _('Ok') }
        cancelText={ _('Cancel') }
    >
        <p style={{ marginBottom : '10px' }}>
            { _("this list has multiple statuses associated with it, please select to which status you want to move this card") }
        </p>

        <Select
            defaultValue={ selectedStatus }
            mode="single"
            size="large"
            placeholder={ _("Please Select") }
            style={{ width: '100%' }}
            onChange={ handleChange }
        >
            { statuses }
        </Select>
    </Modal>
})


let canMoveTo = [];

// a custom functions to run on drag end
// maybe something should be set on drag start
let onDragEnd = [];
let sideBarSwitch;


const cardSource = {
    canDrag (props) {
        const { DataStore } = props;
        if (DataStore.planMode || DataStore.isTemp) return false;
        return true;
    },
    beginDrag(props, monitor, component) {

        const { card, DataStore, ViewStore, swimlane, listIndex } = props;

        sideBarSwitch = ViewStore.sideBarComp;

        setTimeout(() => ViewStore.setBodyOffset(), 250);

        canMoveTo = [ card.id_category_status ];
        onDragEnd = [];

        let currentDragEnded = false;
        onDragEnd.push(() => { currentDragEnded = true } );

        // only allow cards that have the exact field of the swimlane field
        // in their category form to be moved across swimlanes
        if ( DataStore.currentSwimLane &&  DataStore.currentSwimLane.canMove
                && DataStore.currentSwimLane.categoryFieldId ) {
            const field = DataStore.currentSwimLane.categoryFieldId[ card.id_category ];

            if (field === undefined) {
                DataStore.currentSwimLane.canMove = false;
                onDragEnd.push(() => { DataStore.currentSwimLane.canMove = true });
            }
        }

        if (card.is_release == 1) {
            message.loading( _("checking job deployments"), 3600)
            onDragEnd.push(() => { message.destroy() } );
        }

        api.get('/topic/deploy_menu', { topic_mid: card.mid }).done((data)=> {
            message.destroy();
            if ( currentDragEnded ) return;
            if (data.menu.length) {
                ViewStore.sideBar(<Deploy cancel={ () => ViewStore.sideBar(sideBarSwitch) } menu={data.menu} />);
                // we need to update board body offset since we opened a side window
                // of job deployment, this to calculate new boundaries for board body
                // to use in scrolling calculations
                setTimeout(() => ViewStore.setBodyOffset(), 250);
            } else {
                if (card.is_release == 1 ) message.warning(_("No jobs to deploy"), 4);
            }
        });

        api.get('workflow', {
            mid: card.mid,
            category: card.id_category,
            status: card.id_category_status
        }).done( (data) => {

            if ( currentDragEnded ) return;

            data.forEach(function(d){
                if (d) canMoveTo.push( d.id_status_to );
            });

            DataStore.lists.forEach( (list, i) => {
                if (i === listIndex) {
                    DataStore.changeCardStatus = canMoveTo.filter( (mt) => {
                        return list.statuses.indexOf( mt ) !== -1 && mt !== card.id_category_status
                    });
                }

                if ( list.statuses.some( s => canMoveTo.indexOf(s) !== -1 )){
                    DataStore.swimLanes.forEach((swim) => {
                        if (swimlane === swim) {
                            if (i !== listIndex) swim.lists[ i ].canDrop = 1;
                        } else if (typeof swim.value === 'object') {
                            // do not allow swimlanes change when value is an object
                            // like in multi users assigned fields
                        } else if (DataStore.currentSwimLane.canMove) {
                            swim.lists[ i ].canDrop = 1;
                        }
                    })
                }
            })
        });

        return props;
    },
    endDrag(props, monitor) {

        const { DataStore, ViewStore } = props;

        const target = monitor.getDropResult();

        // cleanups
        DataStore.changeCardStatus = [];
        DataStore.changeCardSort = [-1, -1];

        // reset on next tick
        setTimeout( () => {
            ViewStore.stopScrolling();
            onDragEnd.map( (fn) => fn() );

            // only close if droped outside or it's not a job deploy
            if (!target || target.type !== 'deploy') {
                ViewStore.sideBar(sideBarSwitch);
            }

            DataStore.swimLanes.forEach((swim) => {
                swim.lists.forEach( (list) => list.canDrop = 0)
            })
        });


        if (!target) return;

        const card = props.card;

        const fromList = DataStore.lists[ target.from.listIndex ];
        const toList   = DataStore.lists[ target.to.listIndex ];

        const fromSwimLane = target.from.swimlane;
        const toSwimLane   = target.to.swimlane;

        const updateCard = (status) => {

            const updateObj = {}

            if (status !== card.id_category_status) {
                updateObj.status = status;
            }

            let field = null;
            if (toSwimLane !== fromSwimLane) {
                // get field id
                field = DataStore.currentSwimLane.field
                    || DataStore.currentSwimLane.categoryFieldId[ card.id_category ];

                updateObj.field = {
                    id : field,
                    val: toSwimLane.value
                };
            }

            ViewStore.loading(true);
            api.post('topic/update', {
                mid: card.mid,
                status: card.id_category_status,
                category: card.id_category,
                update: JSON.stringify(updateObj)
            }).done( (data) => {
                ViewStore.loading(false);
                if (!data.success) {
                    Modal.error({
                        title: _("Error"),
                        content: data.msg
                    });
                } else {
                    // update card new data
                    card.id_category_status = status;
                    if (field !== null) card[ field ] = toSwimLane.value;

                    // update swimlanes
                    // 1-  remove card from the current swimlane
                    const fromSwimLaneList = fromSwimLane.lists[ target.from.listIndex ];
                    fromSwimLaneList.cards.splice( fromSwimLaneList.cards.indexOf(card), 1 );

                    // 2- add card to the new swimlane
                    toSwimLane.lists[ target.to.listIndex ].cards.unshift( card );

                    fromSwimLane.total--;
                    toSwimLane.total++;

                    // update lists
                    toList.total++;
                    fromList.total--;

                    fromList.cards.splice( fromList.cards.indexOf(card), 1 );
                    toList.cards.unshift( card );
                }
            });
            ViewStore.modal(null);
        };

        if (card.changeStatusTo) {
            updateCard( card.changeStatusTo )
            delete card.changeStatusTo;
            return;
        }

        // dropped in a job deploy
        if (target.type === 'deploy') {
            target.deploy( card );
            return;
        }

        if (!toSwimLane.lists[ target.to.listIndex ].canDrop ) {
            return;
        }

        // before updating lists we need to check if the list has many
        // statuses associated with it and decide to which status we need
        // to move this card to
        let newStatus;
        if (toList.statuses.length > 1) {

            let statusesWeCanMoveTo = [];
            toList.statuses.forEach(function(status){
                if ( canMoveTo.indexOf(status) !== -1 ) {
                    statusesWeCanMoveTo.push(status);
                }
            });

            if (statusesWeCanMoveTo.length === 1) {
                return updateCard( statusesWeCanMoveTo[0] );
            }

            let cancel = function(){
                ViewStore.modal(null);
                ViewStore.loading(false);
            };

            ViewStore.modal(<StatusModal
                statuses={statusesWeCanMoveTo}
                status={card.id_category_status}
                cancel={cancel}
                updateCard={updateCard}
            />);
        } else {
            updateCard( toList.statuses[0] );
        }
    }
};


const cardTarget = {
    hover(props, monitor, component) {
        const dragItem = monitor.getItem();
        const hoverItem = props;

        const { DataStore } = dragItem;

        // no darg sorting for dynamic boards
        if (DataStore.isDynamicBoard) return;

        const draggedCard = dragItem.card;
        const hoveredCard = hoverItem.card;

        const swimlaneList = dragItem.swimlane.lists[ dragItem.listIndex ];

        const dragIndex  = swimlaneList.cards.indexOf( draggedCard );
        const hoverIndex = swimlaneList.cards.indexOf( hoveredCard );

        if (dragItem.swimlane === hoverItem.swimlane &&
            dragItem.listIndex === hoverItem.listIndex &&
            dragIndex !== hoverIndex ) {

            const hoverBoundingRect = component.decoratedComponentInstance.node.getBoundingClientRect()

            // Get vertical middle
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

            // Determine mouse position
            const clientOffset = monitor.getClientOffset()

            // Get pixels to the top
            const hoverClientY = clientOffset.y - hoverBoundingRect.top

            // up
            if (hoverMiddleY > hoverClientY && (dragIndex + 1) !== hoverIndex ) {
                DataStore.changeCardSort[0] = hoveredCard.mid;
                DataStore.changeCardSort[1] = -1;
            }
            // down
            else if (hoverMiddleY < hoverClientY && (dragIndex - 1) !== hoverIndex ) {
                DataStore.changeCardSort[0] = -1;
                DataStore.changeCardSort[1] = hoveredCard.mid;
            }
        } else {
            DataStore.changeCardSort[0] = -1;
            DataStore.changeCardSort[1] = -1;
        }
    },
    drop(props, monitor, component ) {

        const dragItem = monitor.getItem();
        const { DataStore, ViewStore, listIndex, card } = dragItem;

        // sorting use a floating point technique to sort cards
        // we take the mean sorts of the previous card and next card
        // and set the new card sort to that number
        if ( !monitor.getDropResult() ) {

            const list = DataStore.lists[ listIndex ];

            const [sortAbove, sortUnder ] = DataStore.changeCardSort;

            let after = 0;
            let before = 0;
            let sort = null;

            if (sortAbove !== -1) {
                const aboveIndex = list.cards.findIndex( (c) => c.mid == sortAbove );
                const aboveCard = list.cards[aboveIndex];
                before = aboveCard.sort;
                if ( aboveIndex !== 0 ) {
                    after = list.cards[aboveIndex - 1].sort;
                } else {
                    after = before - 1;
                }
                sort = ((after - before) / 2) + before;

            } else if (sortUnder !== -1) {
                const underIndex = list.cards.findIndex( (c) => c.mid == sortUnder );
                const underCard = list.cards[underIndex];
                after = underCard.sort;
                if ( underIndex !== list.cards.length - 1 ) {
                    before = list.cards[ underIndex + 1 ].sort;
                } else {
                    before = after + 1;
                }
                sort = ((after - before) / 2) + before;
            }

            if (sort !== null && !Number.isNaN(sort) ) {
                ViewStore.loading();
                api.post('board/update_sort', {
                    id: DataStore.id,
                    mid: card.mid,
                    sort: sort
                }).done(function(data){
                    card.sort = sort;
                    ViewStore.loading(false);
                    ViewStore.reloadLists();
                })
            }
        }
    }
};

@inject("ViewStore")
@inject("DataStore")
@DropTarget("card", cardTarget, connect => ({
    connectDropTarget: connect.dropTarget()
}))
@DragSource("card", cardSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
}))
@observer class Card extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick (e) {
        const { DataStore, ViewStore, card } = this.props;

        if (DataStore.planMode) {
            const index = DataStore.selectedCards.indexOf( card );
            if (index === -1) {
                DataStore.selectedCards.push( card );
            } else {
                DataStore.selectedCards.splice( index, 1 );
            }
            return;
        }

        if (typeof Cla !== "undefined") {
            Cla.ui.tab.openTopic(this.props.card.mid);
            return;
        }

        ViewStore.sideBar( <CardView card={card} e={e} /> );
    }

    render () {

        const { isDragging, connectDragSource, connectDropTarget, DataStore, card, listIndex, cardIndex, swimlane } = this.props;
        const opacity = isDragging ? .2 : 1;
        const list = DataStore.lists[ listIndex ];

        const isSelected = DataStore.planMode && DataStore.selectedCards.indexOf(card) !== -1;

        const ghost = <div style={{ width: '100%', height: '100px', background: '#eee' }}></div>;

        return connectDropTarget(connectDragSource(
            <div>
                { DataStore.changeCardSort[0] === card.mid && ghost}
                <div
                    ref={ node => (this.node = node) }
                    className={ 'card' + (isDragging ? ' draggable' : '') + (isSelected ? ' selected' : '') }
                    onClick={ this.handleClick }
                    style={{
                        opacity: opacity
                    }}
                >
                    <div className="card-body">
                        <div>
                            <span className="card-creator right">
                                <img style={{ width: 17, height: 17 }} src={'/user/avatar/'+ card.username +'/image.png'} />
                            </span>
                            <CategoryLabel card={ card } />
                        </div>

                        <div className="card-title">{ card.title }</div>
                        <div className="card-options">
                            <div className="card-status">{ _("Status") }: { store.statusById[card.id_category_status].name } </div>
                        </div>
                    </div>
                </div>
                { isDragging && DataStore.changeCardStatus.length > 0 &&
                    <StatusChange
                        statuses={DataStore.changeCardStatus}
                        card={card}
                    />
                }
                { DataStore.changeCardSort[1] === card.mid && ghost}
            </div>
        ))
    }
}

export default Card;
