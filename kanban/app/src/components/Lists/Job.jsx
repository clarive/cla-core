import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, autorun, autorunAsync, action } from 'mobx';
import moment from 'moment';

import {
    Alert,
    Slider,
    Tabs,
    Input,
    Form,
    Select,
    Button,
    DatePicker,
    TimePicker,
    Modal,
    Checkbox
} from 'antd';

const TabPane = Tabs.TabPane;
const ButtonGroup = Button.Group;
const Option = Select.Option;
const FormItem = Form.Item;
const { TextArea } = Input;

import api from 'lib/api';
import { deepCopy } from 'lib/utils';
import store from 'stores/StaticStore.js';
import { CategoryLabel, LoadingMask } from "components/UI.jsx";

const ProjectsModal = inject('ViewStore')(observer( (props) => {

    const projects = [<Option key="all">{ _("All") }</Option>];
    props.projects.forEach(function(id) {
        const project = store.projectById[id];
        projects.push(<Option key={project.mid}>{ project.name }</Option>);
    });

    let selectedProjects = 'all';
    const handleChange = (v) => {
        selectedProjects = v;
    }

    const cancel = function(){
        props.ViewStore.modal(null);
        props.cancel();
    };

    return <Modal
        title={ _("Select a Project") }
        visible={true}
        onOk={ () => props.updateProjects(selectedProjects) }
        onCancel={cancel}
        okText={ _('Ok') }
        cancelText={ _('Cancel') }
        maskClosable={false}
    >
        <p style={{ marginBottom : '10px' }}>
            { _("this topic has multiple projects associated with it, please select one or all") }
        </p>

        <Select
            defaultValue="all"
            mode="single"
            size="large"
            style={{ width: '100%' }}
            onChange={ handleChange }
        >
            { projects }
        </Select>
    </Modal>
}))


@inject('ViewStore')
@observer class JobItems extends React.Component {

    openTopic = (card) => {
        if (typeof Cla !== "undefined") {
            Cla.ui.tab.openTopic(card.mid);
            return;
        }
    }

    scopes = (card) => {
        const scopes = card._project_security.project.map( (id, i) => store.projectById[id].name )
        return ' ' + scopes.join(', ')
    }

    render (){
        const { jobItems } = this.props.localStore;

        return (
            <div>
                { jobItems.map( (card, index) =>
                    <div
                        key = {card.mid + '-item'}
                        className="card"
                        style={{ cursor: 'default', background: (index === 0 && card.is_release == 1 ? '#eee' : '#fff' ) }}
                        onClick={ () => this.openTopic(card) }
                    >
                        <div className="card-body">
                            <div>
                                <CategoryLabel card={ card } />
                            </div>
                            <div className="card-title">{ card.title }</div>
                            <div className="card-options">
                                <div className="card-status">{ _("Scopes") } :
                                    { this.scopes(card) }
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        )
    }
}


const typeLabels = {
    U : {
        style: {
            color : '#F04134'
        },
        label: <span className="job-label">U</span>,
    },

    N : {
        style: {
            color: '#42BE80'
        },
        label: <span className="job-label">N</span>,
    },
    F: {
        style: {
          color: 'gray',
        },
        label: <span className="job-label">F</span>,
    }
}


@inject('ViewStore')
@observer class Job extends React.Component {

    @observable localStore = {
        pipelines: [],
        transitions: [],
        versions: [],
        time: moment('00:00', 'HH:mm'),
        windowType: 'N',

        currentTransition: {},

        jobItems: [],

        // selected values
        pipeline : '',
        transition : '',
        version: '',
        selectedVersion: '',
        versionIsDynamic : 0,
        date: moment(),

        hour: 0,
        minute: 0,
        marks: {},
        comment: '',

        loading: false
    };

    constructor(props) {
        super(props);
    }

    jobItemsString () {
        return JSON.stringify( this.localStore.jobItems.map( (item) => { return { mid: item.mid } } ) )
    }

    @action loadJobWindow () {

        const { transition, date, windowType } = this.localStore;

        if (!transition) return;

        this.localStore.currentTransition = this.localStore.transitions.find( (t) => { return t.id === transition })

        this.localStore.loading = true;
        api.post('/job/build_job_window', {
            bl: this.localStore.currentTransition.job_bl,
            job_date: date.format('YYYY-MM-DD'),
            date_format: '%Y-%m-%d',
            job_contents: this.jobItemsString()
        }).done( (data) => {

            this.localStore.loading = false;
            this.marks = {};
            this.hours = {};

            [ ...Array(24).keys() ].forEach( (h, i) => {
                this.hours[h] = {};
                [ ...Array(60).keys() ].forEach( (m, i) => {
                    this.hours[h][m] = 'F';
                })
            })

            const slots = data.data;

            slots.forEach( (time) => {
                const type = time[2];

                const [hour, minute] = time[0].split(':').map( (v) => Number(v) );

                if (!this.hours[hour]) {
                    this.hours[hour] = {};
                }

                this.hours[hour][minute] = type;
            })

            // plot marks F, N, U on minutes slide
            Object.keys(this.hours).forEach( (hour) => {
                let prevType = '';
                Object.keys( this.hours[hour] ).forEach((minute) => {
                    const type = this.hours[hour][minute]
                    if (type !== prevType) {
                        // this.marks[hour] = this.marks[hour] || {}
                        if (!this.marks.hasOwnProperty(hour)) {
                            this.marks[hour] = {};
                        }

                        this.marks[hour][minute] = typeLabels[type];
                        prevType = type;
                    }
                })
            })

            if (slots.length) {
                const [hour, minute] = slots[0][0].split(':');
                this.setTime( moment( this.localStore.date ).hour( hour ).minute( minute ) );
            } else {
                this.setTime( this.localStore.date )
            }
        })
    }

    loadJobData (projects, project) {

        const { card, job, ViewStore, cancel } = this.props;

        if (!projects || projects.length === 0) {
            Modal.error({
                title: _("Error"),
                content: _("There are no projects related with the changesets")
            });
            cancel();
            return;
        }

        // auto calculate versions when pipeline changes
        autorunAsync(() => {
            const pipeline = this.localStore.pipeline;
            if (!pipeline) return;

            api.post('/job/pipeline_versions', {
                id_rule:  pipeline
            }).done( (data) => {
                // versions
                this.localStore.versions = data.data;
                // selected version
                this.localStore.version = data.data[0].label;

                this.localStore.selectedVersion = "";
            })
        });

        api.post('/job/pipelines', {
            projects:  deepCopy(projects)
        }).done( (data) => {

            if (!data.success) {
                cancel();
                Modal.error({
                    title: _("Error"),
                    content: data.msg
                });
                return;
            } else {
                // pipelines
                this.localStore.pipelines = data.data;
                // set selected pipeline
                this.localStore.pipeline = data.data[0].id;
            }
        })

        api.post('/lifecycle/job_transitions', {
            topics: JSON.stringify([{"topic_mid": card.mid, "state": job.id_status_from, project: project }])
        }).done( (data) => {
            // transitions
            this.localStore.transitions = data.data;

            // set selected transition
            data.data.forEach( (transition) => {
                if (transition.text === job.text) {
                    this.localStore.transition = transition.id;
                }
            })

            this.loadJobWindow();
        })
    }

    componentDidMount () {
        const { ViewStore, card, job } = this.props;

        this.projects = card._project_security.project;
        this.project = card._project_security.project[0];

        const updateProjects = (selectedProjects) => {
            if (selectedProjects === 'all') {
                this.project = 'all';
            } else {
                this.projects = [selectedProjects];
                this.project = selectedProjects;

                this.localStore.jobItems = this.localStore.jobItems.filter( (item) => {
                    return item._project_security.project.indexOf(this.project) !== -1;
                });
            }

            ViewStore.modal(null);
            this.loadJobData( this.projects, this.project );
        };

        const selectProjectOrLoadJob = () => {
            // multiple projects!! lets select one or all
            if (this.projects.length > 0 && card.is_release == 1) {
                ViewStore.modal(<ProjectsModal cancel={ this.props.cancel } projects={this.projects} updateProjects={updateProjects} />);
            } else {
                updateProjects( this.projects[ this.projects.length -1 ] );
            }
        };

        // get all related changesets if release
        if (card.is_release == 1) {
            api.post('job/related_changesets', {
                mid: card.mid,
                status_from: job.id_status_from
            }).done( (data) => {
                this.localStore.jobItems = data.map( (cs) => {
                    // push changeset projects to project lists
                    cs._project_security.project.forEach( (project) => {
                        if (this.projects.indexOf(project) === -1) {
                            this.projects.push(project);
                        }
                    });

                    return cs;
                });

                this.localStore.jobItems.unshift( card );
                selectProjectOrLoadJob();
            });
        } else {
            this.localStore.jobItems = [ card ];
            selectProjectOrLoadJob();
        }

        $( ViewStore.node ).find('.side-bar').on('scroll.scrollHead',function(){
            const $this = $(this);
            $this.find('.side-header').css('top', $this.scrollTop() );
            $this.find('.side-footer').css('bottom', -$this.scrollTop() );
        });
    }

    onChange (type, v) {
        if (type === 'version') {
            // only set selected version when not (latest)
            // (Latest) is always the first version so check against that
            this.localStore.selectedVersion = v === this.localStore.versions[0].label ? "" : v;
        }

        this.localStore[type] = v;

        if (type === 'transition'){
            this.loadJobWindow();
        }
    }

    setDate = (v) => {
        if (!v) v = moment();
        this.localStore.date = v;
        this.loadJobWindow();
    }

    @action setTime (v) {
        if (!v) v = moment();

        this.localStore.date.minute( v.get('minute') )
        this.localStore.date.hour( v.get('hour') )

        if ( this.localStore.date.isBefore( moment(), 'minute' ) ) {
            v = moment();
            this.localStore.date.minute( v.get('minute') )
            this.localStore.date.hour( v.get('hour') )
        }

        const time = v.format('HH:mm');
        // this.localStore.windowType = this.slots.find( (s) => s[0] === time )[2];

        const [ hour, minute ] = time.split(':').map( (t) => Number(t) )

        this.localStore.windowType = this.hours[hour][minute];


        const marks = this.marks[hour] || { 0: typeLabels['F']};
        this.localStore.marks = marks;

        // set sliders
        this.localStore.hour = hour;
        this.localStore.minute = minute;
    }

    setHour = (v) => {
        this.setTime( this.localStore.date.hour(v) );
    }

    setMinute = (v) => {
        this.setTime( this.localStore.date.minute(v) );
    }

    checkDynamicVer = (e) => {
        this.localStore.versionIsDynamic = e.target.checked ? 1 : 0;
    }

    disabledDate = (current) => {
        return current.isBefore(moment(), 'day');
    }

    submit = () => {

        const {
            currentTransition,
            pipelines,
            pipeline,
            windowType,
            date,
            version,
            versionIsDynamic,
            selectedVersion,
            comment
        } = this.localStore;

        if (windowType === 'F' && !comment) {
            Modal.error({
                title: _("Error"),
                content: _("It's mandatory to add comments explaining why this job is outside any time slots"),
            });
            return;
        }

        const obj = deepCopy({
            job_contents: this.jobItemsString(),
            window_type: windowType,
            available_pipelines: pipelines.map( (pipeline) => pipeline.id ),
            selected_project: currentTransition.id_project,
            job_type: currentTransition.job_type,
            bl: currentTransition.job_bl,
            bl_to: currentTransition.bl_to,
            state_to: currentTransition.status_to,
            transitions: currentTransition.id,
            id_rule: pipeline,
            rule_version_tag: selectedVersion,
            rule_version_dynamic: versionIsDynamic,
            job_date: date.format('YYYY-MM-DD'),
            job_time: date.format('HH:mm'),
            check_no_cal: (windowType === 'F' ? 'on' : 'off'),
            comments: comment
        });

        if ( this.localStore.loading ) {
            return;
        }

        this.localStore.loading = true;

        api.post('/job/submit', obj).done((data) => {

            this.localStore.loading = false;

            if (!data.success) {
                Modal.error({
                    title: _("Error"),
                    content: data.msg
                });
                return;
            }

            this.props.cancel(null);
            Modal.success({
                title: _("Success"),
                content: data.msg
            });
        });
    }

    addComment (e) {
        this.localStore.comment = e.target.value;
    }

    render (){
        const { menu } = this.props;
        const { windowType, date } = this.localStore;

        const versions = this.localStore.versions.map( (version) => {
            return <Option key={ version.id || version.label } > { version.label } </Option>
        });

        const pipelines = this.localStore.pipelines.map( (pipeline) => {
            return <Option key={pipeline.id} > { pipeline.rule_name } </Option>
        });

        const transitions = this.localStore.transitions.map( (transition) => {
            return <Option key={transition.id} > { transition.text } </Option>
        });

        const msg = {
            F: _('Outside Window'),
            N: _("Normal"),
            U: _("Urgent")
        }

        const timeWindowMsg = <Alert
            className={ windowType === 'F' ? 'out' : '' }
            style={{ padding: '4px', textAlign: 'center'}}
            message={ msg[windowType] }
            type={ windowType === 'N' ? 'success' : 'error' }
        />

        return (
            <div style={{ width: '100%' }}>
                <Tabs style={{ width: '100%', paddingBottom: '125px', position:'relative' }} className="left" type="card">
                    <TabPane tab="Job Window" key="1">
                        <Form layout="vertical">
                            <FormItem label={ _("Transitions") }>
                                <Select
                                    mode="single"
                                    size="large"
                                    value={ this.localStore.transition }
                                    style={{width: '100%'}}
                                    onChange={ (v) => this.onChange('transition', v) }
                                >
                                    { transitions }
                                </Select>
                            </FormItem>

                            <div style={{ display: !store.perm.canChangePipeLine ? 'none' : '' }}>
                                <FormItem label={ _("Pipelines") }>
                                    <Select

                                        mode="single"
                                        size="large"
                                        value={ this.localStore.pipeline }
                                        style={{width: '100%'}}
                                        onChange={ (v) => this.onChange('pipeline', v) }
                                    >
                                        { pipelines }
                                    </Select>
                                </FormItem>

                                <FormItem label={ _("Version") }>
                                    <Select
                                        mode="single"
                                        size="large"
                                        style={{width: '100%'}}
                                        onChange={ (v) => this.onChange('version', v) }
                                        value={ this.localStore.version }
                                    >
                                        { versions }
                                    </Select>
                                    <Checkbox
                                        style={{ display: this.localStore.selectedVersion ? '' : 'none' }}
                                        onChange={ this.checkDynamicVer }
                                        checked={ this.localStore.versionIsDynamic === 1 }
                                    >
                                            { _("Dynamic tags (calculated during execution)") }
                                    </Checkbox>
                                </FormItem>
                            </div>

                            <FormItem style={{ marginBottom: '5px'}} label={<span>{ _("When") }</span>}>

                                <DatePicker placeholder={ _("Date") } style={{ width: '100%', marginBottom: '5px' }}
                                    value={ this.localStore.date }
                                    disabledDate={ this.disabledDate }
                                    onChange={ this.setDate }
                                    format={ store.prefs.dateFormat }
                                />

                                <div style={{ overflow: 'hidden' }}>
                                    <TimePicker
                                        style={{ width: '35%' }}
                                        format={ store.prefs.timeFormat }
                                        hideDisabledOptions
                                        value={ date }
                                        onChange={ (v) => this.setTime( v ) }
                                    />

                                    <div style={{ float: 'right', width: '65%', padding: '2px 0 0 4px' }}>
                                        { timeWindowMsg }
                                    </div>
                                </div>

                                <Slider
                                    value={ this.localStore.hour }
                                    onChange={ this.setHour }
                                    tipFormatter={null}
                                    step={1}
                                    min={0}
                                    max={23}
                                />

                                <Slider
                                    className={ 'minutes-slider ' + windowType }
                                    value={ this.localStore.minute }
                                    marks={this.localStore.marks}
                                    onChange={ this.setMinute }
                                    tipFormatter={null}
                                    step={1}
                                    min={0}
                                    max={59}
                                />
                            </FormItem>

                            <FormItem label={ _("Comment") }>
                                <TextArea onKeyUp={ (e) => this.addComment(e) } rows={4} />
                            </FormItem>


                        </Form>
                    </TabPane>

                    <TabPane tab="Job Items" key="2">
                        <JobItems localStore={ this.localStore } />
                    </TabPane>
                </Tabs>

                <div className="side-footer" style={{
                    width: '100%', height: '120px', position:'absolute', bottom: 0, left: 0,
                    background: '#f8f8f8', zIndex: 10, borderTop: '1px solid #ccc'
                }}>
                    <div style={{ textAlign: 'center', marginTop: '45px' }}>
                        <Button
                            style={{ marginRight: '5px', display: 'inline-block' }}
                            onClick={ this.props.cancel }
                            size="large"
                        >
                            { _("Cancel") }
                        </Button>
                        <Button
                            disabled={ windowType === 'F' && !store.perm.canCreateJobOutSideWindow ? true : false }
                            type="primary"
                            size="large"
                            onClick={ this.submit }
                            style={{ display: 'inline-block' }}
                        >
                            { _("Submit") }
                        </Button>
                    </div>
                </div>

                {   this.localStore.loading &&
                    <LoadingMask containerClass="side-bar" />
                }
            </div>
        )
    }
}

export default Job;
