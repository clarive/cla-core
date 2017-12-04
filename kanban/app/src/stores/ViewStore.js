import { observable, action } from 'mobx';

class ViewStore {

    constructor (parentEl) {
        this.node = parentEl;
        this.scrollingTimer;
        this.bodyOffset = { top : 1000, left: 1000, width: 0, height: 0 };
    }

    // ======================  OBSERVABLES =========================
    @observable location = null;

    @observable sideBarComp = null;
    @observable headerComp  = null;
    @observable defaultHeader = null;
    @observable bodyComp    = null;
    @observable modalComp   = null;

    @observable overlayLoading = false;

    @observable reload      = 1;

    @observable swimlaneChange = null;


    // ========================  ACTIONS ===========================


    /*
        view sidebar
        ViewStore.sideBar( <Component position="right|left" > )
     */
    @action sideBar(comp) {
        if (comp === this.sideBarComp) return false;
        this.sideBarComp = comp;
    }

    /*
        hide sidebar
        ViewStore.hideSideBar()
     */
    @action hideSideBar() {
        this.sideBarComp = null;
    }

    /*
        show custom component in place of the
        default header

        ViewStore.header(<Component />)
        setting component to null will show the custom header
     */
    @action header(comp) {
        if (comp === this.headerComp) return false;
        this.headerComp = comp;
    }

    /*
        show custom component in place of the
        default body in body section

        ViewStore.body(<Component />)
        setting component to null will show the default body
     */
    @action body(comp) {
        if (comp === this.bodyComp) return false;
        this.bodyComp = comp;
    }

    @action modal(comp) {
        if (comp === this.modalComp) return false;
        this.modalComp = comp;
    }

    @action hideModal() {
        this.modalComp = null;
    }

    @action reloadLists(lists) {
        if (lists) {
            lists.forEach(function(list){
                list.id = Math.random();
            });
        } else {
            // force all lists reload
            this.reload = this.reload + 1
        }
    }

    @action loading (v: boolean = true) {
        this.overlayLoading = v;
    }

    @action setDefaultHeader (header) {
        this.header(header);
        this.defaultHeader = header;
    }

    @action setBodyOffset() {
        const bodyNode = $( this.node ).find('.body');
        const draggedCardNode = $( this.node ).find('.draggable');
        const offset = bodyNode.offset();

        this.bodyOffset = {
            top: offset.top + draggedCardNode.height(),
            left: offset.left  + 50,
            height: window.innerHeight - offset.top,
            width: (bodyNode.width() + offset.left) - 85
        };
    }

    @action stopScrolling() {
        clearInterval(this.scrollingTimer);
    }

    @action scrollBoardLeft () {
        this.stopScrolling();
        this.scrollingTimer = setInterval(()=> {
            const node = $( this.node ).find('.body')[0]
            node.scrollLeft -= 10;
        }, 10)
    }

    @action scrollBoardRight () {
        this.stopScrolling();
        this.scrollingTimer = setInterval(()=> {
            const node = $( this.node ).find('.body')[0]
            node.scrollLeft += 10;
        }, 10)
    }

    @action scrollBoardDown () {
        this.stopScrolling();
        this.scrollingTimer = setInterval(()=> {
            const node = $( this.node ).find('.body')[0]
            node.scrollTop += 10;
        }, 10)
    }

    @action scrollBoardUp () {
        this.stopScrolling();
        this.scrollingTimer = setInterval(()=> {
            const node = $( this.node ).find('.body')[0]
            node.scrollTop -= 10;
        }, 10)
    }

    /*
        reset view to the defaults
        mainly to the kamban lists page
     */
    @action reset() {
        this.sideBarComp = null;
        this.headerComp = null;
        this.bodyComp = null;
    }
}

export default ViewStore;
