import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { DropTarget } from 'react-dnd';

import { Icon } from 'antd';

import api from 'lib/api';
import store from 'stores/StaticStore';
import Card from 'components/Lists/Card.jsx';

const ListTarget = {
    drop(props, monitor, component ) {
        const source = monitor.getItem();
        return {
            to: component.props,
            from: source,
        };
    },
    hover(props, monitor) {
        const { ViewStore } = props;
        const off = monitor.getClientOffset();
        const y = off.y;
        const x = off.x;

        if ( x <= ViewStore.bodyOffset.left ) {
            ViewStore.scrollBoardLeft();
        } else if ( x >= ViewStore.bodyOffset.width) {
            ViewStore.scrollBoardRight();
        } else if ( y < ViewStore.bodyOffset.top ) {
            ViewStore.scrollBoardUp();
        } else if ( y > ViewStore.bodyOffset.height ) {
            ViewStore.scrollBoardDown();
        } else {
            ViewStore.stopScrolling()
        }
    }
}

@inject("ViewStore")
@inject("DataStore")
@DropTarget("card", ListTarget, (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
})) @observer class List extends React.Component {

    constructor(props) {
        super(props);
    }

    render () {
        const { list, swimlane, listIndex } = this.props;
        const { DataStore, isOver, connectDropTarget } = this.props;

        const canDropHere = swimlane.lists[ listIndex ].canDrop;

        return connectDropTarget (
            <div
                className={ 'list ' + ( list.collapsed ? ' collapsed' : '' ) }
                style={{ background: canDropHere ? (isOver ? '#f1ffd8' : '#E6F7FD' ) : '' }}
            >
                <div className="collapsed-content"
                    style={{ display: (list.collapsed ? '' : 'none'), background: canDropHere ? (isOver ? '#f1ffd8' : '#E6F7FD' ) : '' }}>
                    <span className="title">{ list.name }</span>
                </div>
                <div style={{ display: (list.collapsed ? 'none' : ''), visibility: canDropHere ? 'hidden' : 'visible' }}>
                    { this.props.children }
                </div>
            </div>
        )
    }
}


@inject("DataStore")
@observer class MoreCards extends React.Component {

    @observable Comp = null;

    constructor(props) {
        super(props);
        this.loadNext = this.loadNext.bind(this);
    }

    loadNext () {
        const { swimlane, listIndex, currentIndex, swimlaneList, DataStore, cards } = this.props;
        const newSlice = cards.slice(currentIndex, cards.length);

        this.Comp = <div>
            <Cards
                currentIndex={currentIndex}
                swimlane={swimlane}
                listIndex={listIndex}
                swimlaneList={ swimlaneList }
                cards={ newSlice }
            />
        </div>
    }

    componentDidMount () {
        const { swimlaneList, DataStore, cards } = this.props;
        const cardsPerList = DataStore.isDynamicBoard ? DataStore.cardsPerList : Infinity;

        this.Comp = <div onClick={ this.loadNext } className="card" style={{ background: '#fff' }}>
            { cards.length - cardsPerList } { _("cards hidden") }
        </div>
    }

    render () {
        const Comp = this.Comp;
        return <div> { Comp } </div>
    }
}


const Cards = inject("DataStore")(observer( ( props ) => {

    const { DataStore, swimlane, swimlaneList, cards, listIndex, currentIndex=0 } = props;
    const cardsPerList = DataStore.isDynamicBoard ? DataStore.cardsPerList : Infinity;

    return <div>
        { cards.map( (card, index) => {
            if (index === cardsPerList ) {
                return <MoreCards
                    cards={cards}
                    swimlane={swimlane}
                    listIndex={listIndex}
                    key={ Math.random() }
                    currentIndex={index}
                    swimlaneList={ swimlaneList }
                />
            } else if (index > cardsPerList ){
                return null
            } else {
                return <Card key={card.mid}
                    swimlane={swimlane}
                    listIndex={listIndex}
                    card={card}
                    cardIndex={index + currentIndex}
                />
            }
        })}
    </div>
}))


@inject("DataStore")
@observer class SwimLane extends React.Component {
    constructor(props) {
        super(props);
    }

    render () {

        const { DataStore, swimlane } = this.props;
        const swimlaneLists = swimlane.lists;

        return (
            <div className="kanban">
                { DataStore.lists.map( (list, i) =>
                    <List swimlane={swimlane} key={list.id || Math.random() } list={list} listIndex={i} >
                        <Cards cards={ swimlaneLists[i].cards } swimlane={swimlane} listIndex={i} swimlaneList={ swimlaneLists[i] } />
                    </List>
                )}
            </div>
        )
    }
}


const SwimLanes = inject("DataStore")(observer( ({ DataStore }) => {

    return <div className="kanban-body">
        { DataStore.swimLanes.map ( (swimlane, i) =>
            <div key={i} className="swimlane">
                <div onClick={ () => swimlane.collapsed = swimlane.collapsed ? 0 : 1 }
                    className={ 'swim' + (swimlane.collapsed ? ' collapsed' : '') }
                    style={{ display: DataStore.noSwimlanes ? 'none' : '' }}
                >
                    <span className="left" style={{ marginRight: '5px' }}>
                        <Icon type={ swimlane.collapsed ? 'caret-right' : 'caret-down' } />
                    </span>  { swimlane.name }  ( { swimlane.total } )
                </div>

                <div style={{ display: swimlane.collapsed ? 'none'  : '' }}>
                    <SwimLane swimlane={ swimlane } />
                </div>
            </div>
        )}
    </div>
}))


const ListHeader = inject("DataStore")(observer( (props) => {
    const list = props.list;

    return <div className={ 'list ' +
        ( list.wip > 0 && list.total > list.wip ? ' wip-alert' : '') +
        ( list.collapsed ? ' collapsed' : '' )
    }>
        <div className="collapsed-content"
            onClick={ () => list.collapsed = list.collapsed ? 0 : 1 }
            style={{ minHeight: "57px", display: list.collapsed ? '' : 'none' }}
        >
            <span>+</span>
        </div>
        <div style={{height: '100%', display: list.collapsed ? 'none' : '' }}>
            <div className="head"
                onClick={ () => list.collapsed = list.collapsed ? 0 : 1 }>
                { list.wip > 0 &&
                    <span className="wip right">
                        <span>max { list.wip }</span>
                    </span>
                }
                <span className="left total" >{ list.total }</span>
                <span className="left" >{ list.name }</span>

            </div>
        </div>
    </div>
}))


const ListsHeaders = inject("DataStore")(observer( ({ DataStore }) => {
    const lists = DataStore.lists;
    return <div className="kanban-header">
        <div className="kanban">
            {   lists.map( (list) =>
                <ListHeader key={ list.id || Math.random() } list={list} />
            )}
        </div>
    </div>
}))


@inject("DataStore")
@inject("ViewStore")
@observer class KanbanLists extends React.Component {

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const { board, DataStore, ViewStore } = this.props;

        $( ViewStore.node ).find('.body').scroll( function(){
            const $this = $(this);
            $this.find('.kanban-header').css('top', $this.scrollTop() );
            $this.find('.swim').css('margin-left', $this.scrollLeft() );
        });

        DataStore.getBoardData(board);
    }

    render() {

        const { DataStore, ViewStore } = this.props;

        return (
            <div className="kanban-wrapper"  style={{
                'display': this.props.ViewStore.bodyComp ? 'none' : '', paddingBottom: '10px'
            }} >
                <ListsHeaders />
                <SwimLanes />
                {   DataStore.loaded && DataStore.lists.length === 0 && !ViewStore.bodyComp &&
                    <div style={{
                        position: 'absolute',
                        zIndex: 100,
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: '#f2f2f2',
                        opacity: 1
                    }}>
                        <div className="center">
                            { _("Nothing Here, Start By Configuring Your Board Lists Statuses") }
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default KanbanLists;
