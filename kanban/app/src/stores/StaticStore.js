/*
    this store is static, meaning it loads only once during clarive web session
    life cycle and fetches important information that will be used accross all
    kanban boards like, categories, users, labels ...
    this is not a mobx class, so it's not reactive
*/

import api from 'lib/api';

const store = {
    done: false,
    statuses: [],
    statusById: {},
    categories: [],
    categoryById: {},
    projects: [],
    projectById: {},
    labels: [],
    labelById: {},
    users: [],
    userById: {},
    fields: {},

    // user data
    perm: {},
    prefs: {}
};

store.data = function(cb) {
    if (this.done) return cb(store);
    else {
        fetchCategories(cb);
    }
};

function fetchCategories (cb) {
    api.get('categories').done(function(data){
        fetchStatuses(cb);
        data.forEach(function(category){
            store.categoryById[category.id] = category;
            store.categories.push(category);

            category.form.forEach(function(form){
                if (form.key === 'fieldlet.system.users'
                    || form.key === 'fieldlet.system.release'
                    || form.key === 'fieldlet.number'
                    || form.key === 'fieldlet.combo'
                    || form.key === 'fieldlet.pills'
                    || form.key === 'fieldlet.datetime' ) {

                    store.fields[ form.name_field ] = store.fields[ form.name_field ] || {
                        type: form.key,
                        categoryFieldId : {}
                    };
                    store.fields[ form.name_field ].categoryFieldId[ category.id ] = form.id_field;
                }
            });
        });
    });
}

function fetchStatuses (cb) {
    api.get('statuses').done(function(data){
        fetchProjects(cb);
        data.forEach(function(status){
            store.statusById[status.id_status] = status;
            store.statuses.push(status);
        });
    });
}

function fetchProjects (cb) {
    api.get('projects').done(function(data){
        fetchLabels(cb);
        data.forEach(function(project){
            store.projectById[project.mid] = project;
            store.projects.push(project);
        });
    });
}

function fetchLabels (cb) {
    api.get('/label/list').done(function(data){
        fetchUsers(cb);
        data.data.forEach(function(label){
            store.labelById[label.mid] = label;
            store.labels.push(label);
        });
    });
}

function fetchUsers (cb) {
    api.get('users').done( (data) => {
        fetchUserInfo(cb);
        data.forEach(function(user){
            store.userById[user.mid] = user;
            store.users.push(user);
        });
    });
}


function fetchUserInfo (cb) {
    api.get('user_info').done( (data) => {
        store.perm = data.perm;
        store.prefs = data.prefs;
        store.done = true;
        cb();
    });
}

export default store;
