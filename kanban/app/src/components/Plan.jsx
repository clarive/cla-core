import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';

import { Pagination, Button, Icon } from 'antd';
const ButtonGroup = Button.Group;

import api from 'lib/api';
import { deepCopy, setTopicProjects } from 'lib/utils';

import store from 'stores/StaticStore';

import { CategoryLabel, LoadingMask } from "components/UI.jsx";
import BasicFilter from 'components/Filter/Basic.jsx';

@inject("DataStore")
@inject("ViewStore")
@observer class PlanModeHeader extends React.Component {

    constructor(props) {
        super(props);
    }

    addTopics () {
        const { ViewStore, DataStore, localStore } = this.props;
        const mids = localStore.selected.map( (topic) => topic.mid )

        api.post('board/add_cards', {
            id: DataStore.id,
            mids: JSON.stringify( mids )
        }).done(function(data){
            if (data.success) {
                // remove added cards from the plan mode window
                localStore.selected.map( (s) => {
                    const index = localStore.topics.indexOf( s );
                    if (index !== -1) {
                        localStore.topics.splice( index, 1 );
                    }
                })

                localStore.selected = [];
                DataStore.loadBoardCards();
            }
        });
    }

    filter () {
        $( this.props.ViewStore.node ).find('.side-bar').animate({
            scrollTop: 0
        }, 0);
        this.props.localStore.showFilter = true;
    }

    close () {
        const { ViewStore, DataStore } = this.props;
        DataStore.planMode = false;
        ViewStore.reset();
    }

    clear () {
        const { localStore } = this.props;
        localStore.selected = [];
    }

    clearBoard () {
        const { DataStore } = this.props;
        DataStore.selectedCards = [];
    }

    removeTopics () {
        this.props.DataStore.deleteSelectedCards();
    }

    render () {

        const { ViewStore, DataStore, localStore } = this.props;

        return (
            <div style={{ padding: '14px 9px'}}>
                <Button  style={{ margin: '2px' }}
                    className="left" onClick={ this.close.bind(this) }>
                    <Icon type="close" />
                </Button>
                {
                    <Button  style={{ margin: '2px' }}
                        className="left" onClick={ this.filter.bind(this) }>
                        <Icon type="filter" />
                    </Button>
                }

                {   localStore.selected.length > 0 &&
                    <div className="left" style={{ marginLeft: '10px' }}>
                        <ButtonGroup style={{ margin: '2px', marginLeft: '10px' }}>
                            <Button type="danger" ghost onClick={ this.clear.bind(this) }><Icon type="minus" /></Button>
                            <Button type="primary" ghost onClick={ this.addTopics.bind(this) }>
                                { _("Add %1 Selected To Board", localStore.selected.length ) }
                            </Button>
                        </ButtonGroup>
                    </div>
                }

                {   DataStore.selectedCards.length > 0 &&
                    <div className="right" style={{ marginLeft: '10px' }}>
                        <ButtonGroup style={{ margin: '2px', marginLeft: '10px' }}>
                            <Button type="danger" ghost onClick={ this.clearBoard.bind(this) }><Icon type="minus" /></Button>
                            <Button type="primary" ghost onClick={ this.removeTopics.bind(this) }>
                                { _("Delete %1 Selected From Board", DataStore.selectedCards.length ) }
                            </Button>
                        </ButtonGroup>
                    </div>
                }
            </div>
        )
    }
}

@inject("DataStore")
@inject("ViewStore")
@observer class PlanMode extends React.Component {

    constructor(props) {
        super(props);
    }

    selectTopic (topic) {
        const { localStore } = this.props;
        if ( localStore.selected.find( (s) => s.mid === topic.mid ) ) {
            localStore.selected = localStore.selected.filter( (card) => topic.mid !== card.mid )
        } else {
            localStore.selected.push(topic);
        }
    }

    navigate (page, count) {
        const { ViewStore, DataStore, localStore } = this.props;
        localStore.loading = true;

        $( ViewStore.node ).find('.side-bar').animate({
            scrollTop: 0
        }, 0);

        api.get('board/topics', {
            id: DataStore.id,
            page: page,
            filter: JSON.stringify( localStore.filter )
        }).done( (data) => {

            localStore.total = data.total;
            localStore.topics = data.topics.map( (topic) => {
                setTopicProjects( topic );
                return topic;
            });

            localStore.current = Number(data.page);
            localStore.loading = false;
        });
    }

    applyNewFilter () {
        const { localStore } = this.props;
        localStore.oldFilter = observable( deepCopy(localStore.filter) );
        localStore.showFilter = false;
        this.navigate(1)
    }

    cancelFilter () {
        const { localStore } = this.props;
        localStore.filter = observable( deepCopy(localStore.oldFilter) );
        localStore.showFilter = false;
    }

    projects = (card) => {
        const projects = card.__projects.map( (id, i) => {
            return store.projectById[id] ? store.projectById[id].name : ''
        })

        return ' ' + projects.join(', ')
    }

    isSelected = (card) => {
        const { localStore } = this.props;
        return localStore.selected.find( (s) => s.mid === card.mid );
    }

    componentDidMount() {

        const { ViewStore, DataStore, localStore } = this.props;

        DataStore.planMode = true;

        localStore.loading = true;
        setTimeout( () => { this.navigate(1) }, 100 );

        $( ViewStore.node ).find('.side-bar.left').on('scroll.scrollHead',function(){
            const $this = $(this);
            $this.find('.plan-header').css('top', $this.scrollTop() );
            $this.find('.plan-footer').css('bottom', -$this.scrollTop() );
        });
    }

    componentWillUnmount() {
        const { ViewStore } = this.props;
        $( ViewStore.node ).find('*').off('scroll.scrollHead');
        ViewStore.reset();
    }

    render () {

        const { ViewStore, DataStore, localStore } = this.props;
        const top = $(ViewStore.node).find('.side-bar').scrollTop();


        return (
            <div>
                <div className="plan-header" style={{ 'display' : 'none',
                    width: '100%', height: '60px', position:'absolute', top: 0, left: 0,
                    background: '#fff', zIndex: 10, borderBottom: '1px solid #ccc'
                }}>
                    <div className="center" style={{ width: '100%', textAlign: 'center' }}>
                        Selected Issues { localStore.selected.length }
                    </div>
                </div>

                <div
                    className="plan"
                    style={{
                        paddingBottom: '57px',
                        position:'relative'
                    }}
                >
                    { localStore.showFilter &&
                        <BasicFilter filter={localStore.filter} />
                    }

                    <div style={{ display: localStore.showFilter ? 'none' : '', }}>
                        { localStore.topics.map( (card, index) =>
                            <div
                                key = {card.mid}
                                className={ 'card' + (this.isSelected(card) ? ' selected' : '') }
                                onClick={ () => this.selectTopic(card) }
                            >
                                <div className="card-body">
                                    <div>
                                        <span className="card-creator right">
                                            <img
                                                style={{ width: 17, height: 17 }}
                                                src={'/user/avatar/'+ card.username +'/image.png'}
                                            />
                                        </span>
                                        <CategoryLabel card={ card } />
                                    </div>

                                    <div className="card-title">{ card.title }</div>
                                    <div className="card-options">
                                        <div className="card-status">
                                            { _("Status") }: {
                                                store.statusById[card.id_category_status] ?
                                                    store.statusById[card.id_category_status].name :
                                                    ''
                                            }
                                        </div>
                                        <div className="card-status">
                                            { _("Projects") }: { this.projects(card) }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        { !localStore.loading && localStore.topics.length === 0 &&
                            <div className="center">{ _("No Results Found") }</div>
                        }

                    </div>
                </div>
                <div className="plan-footer" style={{
                    width: '100%', height: '60px', position:'absolute', bottom: 0, left: 0,
                    background: '#fff', zIndex: 10, borderTop: '1px solid #ccc'
                }}>
                    <div
                        className="center noselect"
                        style={{
                            display: localStore.showFilter ? 'none' : '',
                            width: '100%',
                            textAlign: 'center'
                        }}
                    >
                        { localStore.total > 0 &&
                            <Pagination key={localStore.current} size="small"
                                simple
                                onChange={ this.navigate.bind(this) }
                                total={localStore.total}
                                defaultCurrent={localStore.current}
                                pageSize={100}
                            />
                        }
                    </div>

                    <div
                        className="center noselect"
                        style={{
                            display: localStore.showFilter ? '' : 'none',
                            width: '100%',
                            textAlign: 'center'
                        }}
                    >
                        <Button
                            style={{ marginRight: '5px', display: 'inline-block' }}
                            onClick={ this.cancelFilter.bind(this) }
                            size="large"
                        >
                            { _("Cancel") }
                        </Button>
                        <Button
                            size="large"
                            onClick={ this.applyNewFilter.bind(this) }
                            style={{ display: 'inline-block' }}
                            type="primary"
                            ghost
                        >
                            { _("Apply") }
                        </Button>
                    </div>
                </div>

                {   localStore.loading &&
                    <LoadingMask containerClass="side-bar" />
                }
            </div>
        )
    }
}


export default function(ViewStore, DataStore){

    const localStore = observable({
        topics: [],
        selected: [],
        total: 0,
        current: 1,
        showFilter: false,
        filter: deepCopy( DataStore.filter ),
        oldFilter: deepCopy( DataStore.filter ),
        loading: false
    });

    ViewStore.header(<PlanModeHeader localStore={localStore} />);
    ViewStore.sideBar(<PlanMode localStore={localStore} position="left" />);
}
