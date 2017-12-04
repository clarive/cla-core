import { autorun, computed, observable, action } from 'mobx';
import React from "react";

import api from 'lib/api';
import { dynamicSort } from "lib/utils.js";

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

const defaultSwimLanesMap = {
    'no swimlanes' : {
        field: 'no swimlanes'
    },
    'Creator' : {
        field: 'created_by',
        canMove: false
    },
    'Categories' : {
        field: 'id_category',
        formatter (swimlanes, callback) {
            swimlanes.forEach( (swimlane) => {
                const val = swimlane.name;
                const cat = store.categoryById[val];
                swimlane.name = cat ? cat.name : val;
            });
            callback(swimlanes);
        },
        canMove: false
    }
}

const quickFilterObj = {
    categories : [],
    createdBy: [],
    labels: [],
    statuses: [],
    assignedTo: []
};

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
    'fieldlet.system.release' : function(swimlanes, callback){
        const mids = swimlanes.map( (s) => s.name );
        api.post('board/topicsbymid', {
            mids: JSON.stringify( mids )
        }).done( (data) => {
            const newSwimlanes = [];
            data.forEach((topic)=> {
                const swim = swimlanes.find( (s) => s.name === topic.mid );
                swim.name = <span>
                    <span style={{
                        background: topic.category_color,
                        padding: '5px',
                        margin: '3px 5px 3px 0',
                        display: 'block',
                        border: '2px solid #fff',
                        float: 'left'
                    }}></span>
                    <span style={{ display: 'block'}}> { topic.title } </span>
                </span>;
                newSwimlanes.push(swim);
            });

            callback(swimlanes);
        });
    }
}

class DataStore {

    constructor(ViewStore, ClaStore) {
        this.ClaStore = ClaStore;
        this.ViewStore = ViewStore;

        // temprary boards filter
        this.tempFilter = undefined;

        // what we are doing here?
        // this function runs automatically when ever we set a new category
        // in the filters, we have fields in swimlanes and by default fields
        // collected from all categories, but when we have certain categories
        // we only need fields in those categories
        autorun ( () => {
            const categories = this.filter.categories.length ?
                this.filter.categories : store.categories.map( (cat) => cat.id );

            if (categories.length) {
                // build custom Fiedls for the available categories only
                this.customSwimLaneFields = [];
                const arr = [];
                Object.keys( store.fields ).sort().forEach( (key) => {
                    const field = store.fields[key];
                    const hasField = categories.find( (id) => !!field.categoryFieldId[id] );
                    if (hasField) {
                        arr.push({
                            name: key,
                            categoryFieldId: field.categoryFieldId,
                            type: field.type,
                            formatter: Formatters[field.type],
                            canMove: true
                        });
                    }
                });
                setTimeout ( () => { this.customSwimLaneFields = arr });
            }
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

    @observable customSwimLaneFields = [];

    // for dragging cards
    @observable changeCardSort = [-1, -1];
    @observable changeCardStatus = [];

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
        this.customSwimLaneFields.forEach( (field) => {
            Object.keys(field.categoryFieldId).forEach( (id) => {
                customFields[ field.categoryFieldId[id] ] = 1;
            })
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

            this.updateSwimLanes( this.currentSwimLane.key ? this.currentSwimLane.key : 'no swimlanes');
            this.ViewStore.loading(false);
            this.loaded = true;
        });
    }

    @action updateSwimLanes (swimlane: string) {

        this.ViewStore.loading();

        setTimeout( () => {

            let key = swimlane;
            swimlane = defaultSwimLanesMap[swimlane] ||
                this.customSwimLaneFields.find( (field) => field.name === key );

            swimlane.key = key;

            this.currentSwimLane = swimlane;

            const formatter = swimlane.formatter;
            let field = swimlane.field;
            const everythingText = swimlane.everythingText || _("Everything Else")

            let swimlanes = {};

            this.lists.forEach( (list, index) => {
                const cards = list.cards;

                cards.forEach( (card, i) => {

                    field = field || swimlane.categoryFieldId[ card.id_category ];

                    if (this.quickFilter.categories.length) {
                        if (this.quickFilter.categories.indexOf( card.id_category ) === -1){
                            return;
                        }
                    }

                    if (this.quickFilter.statuses.length) {
                        if (this.quickFilter.statuses.indexOf( card.id_category_status ) === -1){
                            return;
                        }
                    }

                    if (this.quickFilter.createdBy.length) {
                        if (this.quickFilter.createdBy.indexOf( card.created_by ) === -1){
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

                    const value = card[field];
                    const key = (value === undefined || value == '') ? everythingText : value;

                    swimlanes[key] = swimlanes[key] || {
                        total: 0,
                        value: value,
                        lists: this.lists.map( () => {
                            return {
                                cards: [],
                                cardsPerList: 0,
                                canDrop: 0
                            }
                        })
                    }

                    if (!swimlanes[key].lists[index]) swimlanes[key].lists[index] = [];
                    swimlanes[key].lists[index].cards.push(card);
                    swimlanes[key].total++;
                });
            });

            const arr = Object.keys(swimlanes).map( (key, i) => {
                const swim = swimlanes[key];
                return {
                    name: key,
                    value: swim.value,
                    lists: swim.lists,
                    total: swim.total,
                    collapsed: 0
                };
            });

            // remove everything to put last at the end after sorting all swimlanes
            const everthingIndex = arr.findIndex((o) => o.name === everythingText);
            let everything = [];
            if (everthingIndex !== -1) {
                everything = arr.splice( everthingIndex, 1 );
            }

            const sortSwimlanes = (newArr) => {
                this.swimLanes.replace( newArr.sort(dynamicSort('name')) );
                if (everthingIndex !== -1) {
                    this.swimLanes.push( everything[0] )
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
        this.updateSwimLanes( this.currentSwimLane.key );
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
        return this.currentSwimLane && this.currentSwimLane.key === 'no swimlanes'
    }

    // reset current board data
    @action reset(id) {
        this.id = id;
        this.swimLanes = [];
        this.lists = [];
        this.filter = filterObj;
        this.currentSwimLane = {};
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
