import { autorun, computed, observable, action } from 'mobx';
import React from "react";

import api from 'lib/api';
import { dynamicSort, setTopicProjects } from "lib/utils.js";

import store from 'stores/StaticStore';

const filterObj = {
    query: "",
    projects: [],
    categories: [],
    labels: [],
    statuses: [],
    createdOn: [],
    modifiedOn: [],
    createdBy: ""
};

const defaultSwimLanesMap = [
    {
        name: 'no swimlanes',
        id: 'no swimlanes',
        field: 'no swimlanes',
        all: 1,
        everything: {
            enable: 1,
            position: 'bottom'
        },
        meta : {}
    },
    {
        name: 'Creator',
        id: 'creator',
        field: 'created_by',
        all: 1,
        everything: {
            enable: 1,
            position: 'bottom'
        },
        meta: {},
        canMove: false
    },
    {
        name: 'Categories',
        id: 'categories',
        field: 'id_category',
        formatter (swimlanes, callback) {
            swimlanes.forEach( (swimlane) => {
                const val = swimlane.name;
                const cat = store.categoryById[val];
                swimlane.name = cat ? cat.name : val;
            });
            callback(swimlanes);
        },
        all: 1,
        everything: {
            enable: 1,
            position: 'bottom'
        },
        meta: {},
        canMove: false
    }
]

const quickFilterObj = {
    categories : [],
    createdBy: [],
    labels: [],
    statuses: [],
    assignedTo: []
};

const openTopic = (mid) => {
    if (typeof Cla !== "undefined") {
        Cla.ui.tab.openTopic(mid);
        return;
    }
}

const Formatters = {
    'fieldlet.system.users' : function(swimlanes, callback){

        swimlanes.forEach(function(swimlane){
            const val = swimlane.name;
            const parts = typeof val === 'string' ? val.split(',') : val;
            if (Array.isArray(parts)) {

                // Why we re assign value of swimlane here?
                // this to distinct between multi assigned users
                // some values of multi users are arrays and some are comma
                // seperated and this is really hard to detect unless we unify
                // the value, so if a value is an object then it's a multi user
                // assigned field, this is important for not allowing moving cards
                // to multi users swimlanes
                if (parts.length > 1) {
                    swimlane.value = parts;
                }

                try {
                    const assignee = [];
                    parts.forEach(function(id){
                        const user = store.userById[id];
                        if (!user) assignee.push(id);
                        else assignee.push(user.username);
                    });
                    swimlane.name = assignee.join(' | ');
                } catch (e){
                    const user = store.userById[val];
                    swimlane.name = user ? user.username : val;
                }
            } else {
                const user = store.userById[val];
                swimlane.name = user ? user.username : val;
            }
        });

        callback(swimlanes);
    },
    'fieldlet.system.list_topics' : function(swimlanes, callback){
        const mids = swimlanes.map( (s) => s.value );
        api.post('board/topicsbymid', {
            mids: JSON.stringify( mids )
        }).done( (data) => {
            data.forEach((topic)=> {
                const swim = swimlanes.find( (s) => s.value == topic.mid );
                if (!swim) return;
                swim.name = <span>
                    <span
                        style={{
                            background: topic.category_color,
                            padding: '5px',
                            margin: '3px 5px 3px 0',
                            display: 'block',
                            border: '2px solid #fff',
                            float: 'left'
                        }}
                        onClick={ (e) => { e.stopPropagation(); openTopic(topic.mid) } }
                    ></span>
                    <span> { topic.title } </span>
                </span>;
            });
            callback(swimlanes);
        });
    }
}

Formatters['fieldlet.system.release'] = Formatters['fieldlet.system.list_topics'];

class DataStore {

    constructor(ViewStore, ClaStore) {
        this.ClaStore = ClaStore;
        this.ViewStore = ViewStore;

        // this will tell us if parent field already
        // requested from master_rel if
        // this.parentFieldRequested[ parent_field_id ] = 1
        this.parentFieldRequested = {};

        // temprary boards filter
        this.tempFilter = undefined;

        autorun ( () => {

            const swimlanes = this.swimlanesSettings;
            this.customSwimLanes = [];
            let arr = [];
            swimlanes.forEach( (swimlane) => {

                const field = store.fields[swimlane.fieldId];

                // do some notification for user here?
                // a missmatch field with swimlanes
                if (!field) return;

                arr.push({
                    ...swimlane,
                    meta: { ...field.meta },
                    categoryFieldId: field.categoryFieldId,
                    formatter: swimlane.all ? Formatters[field.type] : null,
                    canMove: true
                });
            });

            setTimeout ( () => { this.customSwimLanes = arr });
        })
    }

    // ======================  OBSERVABLES =========================

    // board id
    @observable id = '';

    // board name
    @observable name = '';

    @observable loaded = false;

    @observable isAdmin = false;

    @observable planMode = false;

    @observable selectedCards = [];

    @observable type = 'dynamic';

    @observable users = [];

    // user boards
    @observable boards = [];

    // board lists
    @observable lists = [];

    // board filter
    @observable filter = filterObj;

    //board swimlane current view
    @observable swimLanes = [];

    @observable cardsPerList = 10;

    @observable currentSwimLane = {};

    @observable quickFilter = quickFilterObj;

    @observable unMappedStatuses = [];

    @observable customSwimLanes = [];

    // for dragging cards
    @observable changeCardSort = [-1, -1];
    @observable changeCardStatus = [];

    @observable swimlanesSettings =  [];

    // ========================  ACTIONS ===========================

    @action getBoardData (board) {
        this.id = board;
        this.ViewStore.loading();

        let filter = 0;
        if ( this.ClaStore.filter ) {
            filter = JSON.stringify( this.ClaStore.filter );
        }

        api.post('board/data', {
            id: this.id,
            name: this.id === 'temp' ? this.ClaStore.name : '',
            filters: filter
        }).done( (data) => {

            if (!data.board) {
                alert( _("board with id %1 is not found", this.id)  );
                if (this.ClaStore && this.ClaStore.onClose) {
                    this.ClaStore.onClose();
                }
                return;
            }

            let board = data.board;
            let lists = board.settings.lists || [];

            this.isAdmin = data.isAdmin ? true : false;

            this.users = board.settings.users || [];

            this.id = board.id;

            this.name = board.name;

            this.type = board.settings.type;

            this.filter = board.settings.filter;

            this.swimlanesSettings = Array.isArray( board.settings.swimlanes ) ?
                board.settings.swimlanes :
                [];

            if (this.ClaStore && this.ClaStore.onLoad) {
                this.ClaStore.onLoad(board);
            }

            setTimeout ( () => { this.loadBoardCards() }, 100 );
        });
    }

    @action loadBoardCards () {

        this.ViewStore.loading();

        // get custom fields to load
        const customFields = {};
        this.customSwimLanes.forEach( (swimlane) => {
            // avoid loading these fields because we are going
            // to request them later from master_rel
            if ( swimlane.meta.rel_type !== 'topic_topic' ) {
                Object.keys(swimlane.categoryFieldId).forEach( (id) => {
                    customFields[ swimlane.categoryFieldId[id] ] = 1;
                })
            }
        });

        api.post('board/topics', {
            id: this.id,
            cards: this.type !== 'dynamic' ? 1 : 0,
            fields: JSON.stringify( Object.keys(customFields) ),
            filters: this.id === 'temp' ? JSON.stringify(this.filter) : 0
        }).done( (lists) => {

            this.lists = [];
            lists.forEach( (list, i) => {
                list.collapsed = list.collapsed ? 1 : 0;
                list.id = Math.random();
                this.lists.push(list);

                // sort cards for static boards
                this.lists[i].cards = this.type !== 'static'
                    ? list.cards
                    : list.cards.sort(function(a,b){
                        if (a.sort < b.sort) return -1;
                        if (a.sort > b.sort) return 1;
                        return 0;
                    });

                this.lists[i].total = list.total;
            });

            if (!this.currentSwimLane.id) {
                this.currentSwimLane = this.customSwimLanes.find( (swim) => swim.default == 1 ) || {};
            }

            this.updateSwimLanes();
            this.ViewStore.loading(false);
            this.loaded = true;
        });
    }

    @action updateSwimLanes (swimlaneId: string) {

        if (!swimlaneId) {
            swimlaneId = this.currentSwimLane.id ? this.currentSwimLane.id : 'no swimlanes';
        }

        this.ViewStore.loading();

        let swimlane = defaultSwimLanesMap.find( (swim) => swim.id === swimlaneId ) ||
            this.customSwimLanes.find( (swim) => swim.id === swimlaneId ) ||
            defaultSwimLanesMap.find( (swim) => swim.id === 'no swimlanes' );

        this.currentSwimLane = swimlane;

        // if the requested swimlane is a parent child type
        // we need one more request to fetch relation from master_rel
        const field = swimlane.meta.parent_field || swimlane.meta.release_field;
        if ( swimlane.meta && field && !this.parentFieldRequested[field] ) {

            api.post('board/topic_parents', {
                field: field,
                mids: JSON.stringify ( swimlane.all ? [] : swimlane.values.map((v) => v.value) )
            }).done( (data) => {

                this.lists.forEach( (list, index) => {
                    list.cards.forEach( (card) => {
                        card[ swimlane.meta.id_field ] = data[ card.mid ];
                    })
                })

                // mark this field as already fetched so we don't
                // have to request again, field data already attached
                // to each card by now
                this.parentFieldRequested[field] = 1;

                // we have the swimlane data now, run update swimlanes
                this.updateSwimLanes();
            })
            return;
        }

        setTimeout( () => {

            const formatter = swimlane.formatter;
            let field = swimlane.field;

            const everythingKey = Math.random();
            const everythingEnabled  = swimlane.everything.enable;
            const everythingText = swimlane.everything.text || _("Everything Else");
            const everythingPosition  = swimlane.everything.position;

            let swimlanes = {};

            this.lists.forEach( (list, index) => {
                const cards = list.cards;

                cards.forEach( (card, i) => {

                    setTopicProjects( card );

                    if (swimlane.categoryFieldId){
                        field = swimlane.categoryFieldId[ card.id_category ];
                    }

                    if (this.quickFilter.categories.length) {
                        if (this.quickFilter.categories.indexOf( card.id_category ) === -1) {
                            return;
                        }
                    }

                    if (this.quickFilter.statuses.length) {
                        if (this.quickFilter.statuses.indexOf( card.id_category_status ) === -1) {
                            return;
                        }
                    }

                    if (this.quickFilter.createdBy.length) {
                        if (this.quickFilter.createdBy.indexOf( card.created_by ) === -1) {
                            return;
                        }
                    }

                    if (this.quickFilter.assignedTo.length) {
                        if (this.quickFilter.assignedTo.indexOf( card.Asignada ) === -1){
                            return;
                        }
                    }

                    if (this.quickFilter.labels.length) {
                        if (!card.labels || !card.labels.length){
                            return;
                        }
                        else if ( !this.quickFilter.labels.some( (label) => card.labels.indexOf(label) !== -1 ) ){
                            return;
                        }
                    }

                    let value = card[field];
                    let key = everythingKey;

                    // array? only allow array values with single value
                    // to be listed in swimlanes
                    if (value != null && typeof value === 'object') {
                        if (value.length === 1) {
                            value = value[0];
                        } else {
                            value = "";
                        }
                    }

                    if ( value === 0 || ( value != "" && value ) ) {
                        if (swimlane.all == 1 || swimlane.values.some((v) => v.value == value)) {
                            key = value;
                        }
                    }

                    swimlanes[key] = swimlanes[key] || {
                        name: key,
                        value: value,
                        total: 0,
                        collapsed: 0,
                        lists: this.lists.map( () => {
                            return {
                                cards: [],
                                cardsPerList: 0,
                                canDrop: 0
                            }
                        })
                    }

                    swimlanes[key].lists[index] = swimlanes[key].lists[index] || [];
                    swimlanes[key].lists[index].cards.push(card);
                    swimlanes[key].total++;
                });
            });

            const everythingLane = swimlanes[everythingKey];
            if (everythingLane) everythingLane.name = everythingText;
            delete swimlanes[everythingKey];

            let arr = [];
            if ( !swimlane.all && swimlane.values ) {
                swimlane.values.forEach( (val) => {
                    const value = val.value;
                    const name = val.name;
                    if (swimlanes[value]) {
                        const v = swimlanes[value];
                        v.name = name;
                        delete swimlanes[value];
                        arr.push( v );
                    } else {
                        // push an empty swimlane
                        arr.push({
                            name: name, value: value, total: 0, collapsed: 0,
                            lists: this.lists.map( () => {
                                return {
                                    cards: [],
                                    cardsPerList: 0,
                                    canDrop: 0
                                }
                            })
                        });
                    }
                });
            } else {
                arr = Object.keys(swimlanes).map( (key, i) => {
                    return swimlanes[key];
                });
            }

            const sortSwimlanes = (newArr) => {
                this.swimLanes.replace( newArr );
                if (everythingEnabled && everythingLane ) {
                    if (everythingPosition === 'top') {
                        this.swimLanes.unshift( everythingLane );
                    } else {
                        this.swimLanes.push( everythingLane );
                    }
                }
                this.ViewStore.loading(false);
            }

            if (formatter) {
                formatter(arr, sortSwimlanes)
            } else {
                sortSwimlanes(arr);
            }
        }, 500);
    }

    @action deleteSelectedCards () {

        this.ViewStore.loading(true);
        api.post('board/remove_cards', {
            id: this.id,
            mids: JSON.stringify( this.selectedCards.map( (topic) => topic.mid ) )
        }).done( (data) => {
            this.selectedCards = [];
            this.loadBoardCards();
        })
    }

    @action clearQuickFilters () {
        this.quickFilter = quickFilterObj;
        this.updateSwimLanes();
    }

    @computed get hasQuickFilter() {
        let quickFilter = this.quickFilter;
        let filtersNum = 0;
        Object.keys(quickFilter).forEach( (key) => {
            const filter = quickFilter[key];
            if (filter.length > 0 ) {
                filtersNum++;
            }
        })
        return filtersNum;
    }

    @computed get isDynamicBoard() {
        return this.type === 'dynamic' ? true : false;
    }

    @computed get isStaticBoard() {
        return this.type === 'static' ? true : false;
    }

    @computed get isTempBoard() {
        return this.id === 'temp' ? true : false;
    }

    @computed get noSwimlanes() {
        return this.currentSwimLane && this.currentSwimLane.id === 'no swimlanes'
    }

    // reset current board data
    @action reset(id) {
        this.id = id;
        this.swimLanes = [];
        this.lists = [];
        this.filter = filterObj;
        this.parentFieldRequested = {};
    }

    @action deleteBoard () {
        api.post('board/delete', {
            id : this.id
        }).done(() => {
            if (this.ClaStore && this.ClaStore.onDelete) {
                this.ClaStore.onDelete();
            } else {

            }
        })
    }
}

export default DataStore;
