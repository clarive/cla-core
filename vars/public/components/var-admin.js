import React from 'react';
import ReactDOM from 'react-dom';
import { message, Dropdown, Popconfirm, Table, Menu, Modal, Form, Input, Button, Select } from 'antd';
import { LocaleProvider, enUS, esES } from 'antd';
import Api from '../lib/api.js';

const Search = Input.Search;
const FormItem = Form.Item;
const Option = Select.Option;

const relativeCss = {
    position: 'relative',
    height: '100%'
}

const formItemStyle = {
    margin: '4px 0'
}

class VarForm extends React.Component {

    changeType (value) {
        this.form.setFieldsValue({ vartype: value })
    }

    render () {
        const { modalVisible, onCancel, onOk, record, form, allProjects, allEnvs } = this.props;
        const { getFieldDecorator } = form;

        const type = form.getFieldValue('vartype') || 'plain';
        const title = record.mid ? _('Edit Variable') : _('New Variable');

        return (
            <Modal
                visible={ modalVisible }
                title={ title }
                width={ 800 }
                onCancel={ onCancel }
                onOk={ onOk }
                okText={ _('Save') }
                cancelText={ _('Cancel') }
            >
                <Form>
                    <FormItem style={{ display: 'none' }}>
                        {getFieldDecorator('mid', {
                            initialValue: record.mid
                        })(
                            <Input type="hidden"/>
                        )}
                    </FormItem>
                    <FormItem label={ _("Variable") } style={ formItemStyle }>
                        {getFieldDecorator('varname', {
                            initialValue: record.varname,
                            rules: [{ required: true, message: _('Please enter variable name') }],
                        })(
                            <Input id="varname" placeholder= { _("Variable Name") } />
                        )}
                    </FormItem>

                    <FormItem label={ _("Type") } style={ formItemStyle }>
                        {getFieldDecorator('vartype', {
                            initialValue: record.vartype,
                            rules: [{ required: true, message: _('Please select variable type') }],
                        })(
                            <Select
                                defaultValue="plain"
                                placeholder={ _("Variable type") }
                                changeType={ this.changeType.bind(this) }
                            >
                                <Option value="plain">{ _('Text') }</Option>
                                <Option value="secret">{ _('Secret') }</Option>
                            </Select>
                        )}
                    </FormItem>


                    <FormItem
                        label={ _('Plain Text Value') }
                        style={{ ...formItemStyle, display: type === 'plain' ? '' : 'none' }}
                    >
                        {getFieldDecorator('varPlainValue', {
                            initialValue: record.varPlainValue,
                        })(
                            <Input.TextArea
                                id="valuePlain"
                                type='text'
                                className="mono-font"
                                placeholder={ _("Value") }
                                rows={4}
                            />
                        )}
                    </FormItem>

                    <FormItem
                        label={ _("Secret Value") }
                        style={{ ...formItemStyle, display: type === 'secret' ? '' : 'none' }}
                    >
                        {getFieldDecorator('varSecretValue', {
                            initialValue: record.varSecretValue,
                        })(
                            <Input
                                id="valueSecret"
                                type='password'
                                placeholder={ _("Value") }
                                onFocus={ (e) => e.target.select() }
                            />
                        )}
                    </FormItem>

                    <FormItem label={ _('Projects') } style={ formItemStyle }>
                        {getFieldDecorator('projects', {
                            initialValue: record.projects,
                        })(
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                filterOption={(input, option) => option.props.project.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                                placeholder={ _("Select a Project") }
                            >
                                { allProjects }
                            </Select>
                        )}
                    </FormItem>
                    <FormItem label={ _('Environments') }>
                        {getFieldDecorator('envs', {
                            initialValue: record.envs,
                        })(
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                filterOption={(input, option) => option.props.env.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                                placeholder={ _("Select an Environment") }
                            >
                                { allEnvs }
                            </Select>
                        )}
                    </FormItem>
                </Form>
            </Modal>
        )
    }
}

VarForm = Form.create()(VarForm);

class VarAdmin extends React.Component {

    constructor(props){

        super(props);

        this.state = {
            modalVisible: false,
            confirmDelete: false,
            record: {},
            data: [],
            allEnvs: [],
            allProjects: [],
            pagination: { pageSize: 20 },
            loading: false
        }
    }

    handleTableChange(pagination, filters, sorter) {

        const pager = { ...this.state.pagination };
        pager.current = pagination.current;

        this.setState({
            pagination: pager
        });

        this.fetch({
            limit: pagination.pageSize,
            page: pagination.current,
            sortField: sorter.field,
            sortOrder: sorter.order,
            ...filters
        });
    }

    fetch(params = {}) {
        var self = this;

        this.setState({ loading: true });

        Api.get('/plugin/vars/list', {
            limit: 20,
            ...params
        }).done( (res) => {

            if( ! res.success ) {
                message.error( res.reason );
                this.setState({
                    record: {},
                    loading: false
                });
            }
            else {
                const pagination = { ...self.state.pagination };
                pagination.total = res.total;

                this.setState({
                    record: {},
                    loading: false,
                    data: res.data,
                    pagination: pagination
                });
            }
        });
    }

    fetchComboData() {
        Api.get('/plugin/common/user/projects').done( (res) => {
            this.setState({
                allProjects: res.map( (val) => <Option value={ val.mid } project={ val.name } >{ val.name }</Option> )
            });
        });

        Api.get('/plugin/common/envs').done( (res) => {
            this.setState({
                allEnvs: res.map( (val) => <Option value={ val.mid } env={ val.name }>{ val.name }</Option> )
            });
        });
    }

    componentDidMount() {
        this.fetchComboData();
        this.fetch();
    }

    searcher(query) {
        this.fetch({ query: query });
    }

    showModal(rec) {

        const isSecretType = rec.vartype === 'secret';
        rec.origValue = isSecretType ? '__clarive_secret__' + Math.random() : rec.varvalue;

        this.form.setFieldsValue({
            mid: rec.mid,
            vartype: rec.vartype,
            varname: rec.varname,
            projects: rec.projects,
            varSecretValue: isSecretType ? rec.origValue : '',
            varPlainValue: isSecretType ?  '' : rec.origValue,
            envs: rec.envs
        });

        this.setState({
            record: rec,
            modalVisible: true,
        });
    }

    deleteVar( mid ) {
        let setDel = {};
        Object.keys( this.state.confirmDelete ).map( mid => setDel[ mid ] = false );
        setDel[ mid ] = true;

        this.setState({
            confirmDelete: setDel
        });
    }

    deleteOk( mid ) {
        this.setState({
            confirmDelete: { [mid]: false }
        });

        Api.get('/plugin/vars/delete', {
            mid: mid
        }).done( res => {
            message.success( _('Deleted variable %1', res.varname ) );
            this.fetch();
        });
    }

    copyVar( mid ) {
        Api.get('/plugin/vars/copy', {
            mid: mid
        }).done( res => {
            message.success( _('Copied variable %1', res.varname ) );
            this.fetch();
        });
    }

    handleCancel(e) {
        this.setState({
            modalVisible: false
        });
     }

    handleOk(e) {

        e.preventDefault();

        this.form.validateFieldsAndScroll((error, values) => {
            if (!error) {

                const isSecretType = values.vartype === 'secret';

                values.varvalue = isSecretType ? values.varSecretValue : values.varPlainValue;

                const currentVariable = this.state.data.find( (item) => item.mid === values.mid ) || {};
                const secretChanged = isSecretType && currentVariable.origValue !== values.varvalue;

                Api.postJSON('/plugin/vars/save', { values, secretChanged }).done( (res)=>{

                    if( res.success ) {
                        this.setState({
                            modalVisible: false
                        });
                        this.fetch();
                        this.form.resetFields();
                    }
                    else {
                        message.error( _('Error saving variable: %1', res.reason) );
                    }
                });
            }
        });
    }

    render(){

        const columns = [
            {
                title: 'Variable',
                key: 'varname',
                render: ( name, rec ) => {
                    return (
                        <span
                            onClick={ this.showModal.bind(this,rec) }
                            style={{ cursor: 'pointer' }}
                            className='mono-font'
                        >
                            { rec.varname }
                        </span>
                    )
                }
            },
            {
                title: _('Type'),
                key: 'vartype',
                dataIndex: 'vartype'
            },
            {
                title: _('Environments'),
                key: 'env_names',
                render: (val, rec) => {
                    return rec.env_names && rec.env_names.length ? rec.env_names.join(', ') : _('[all]');
                }
            },
            {
                title: _('Projects'),
                key: 'project_names',
                render: (val, rec) => {
                    return rec.project_names && rec.project_names.length ? rec.project_names.join(', ') : _('[all]');
                }
            },
            {
                title: _('Value'),
                key: 'varvalue',
                dataIndex: 'varvalue',
                render: ( name, rec ) => {
                    return (
                        <div>
                            <div>
                                { rec.varvalue }
                            </div>
                        </div>
                    )
                }
            },
            {
                title: _('Action'),
                key: 'action',
                render: (name, rec) => {

                    const menuPadding = { padding: '7px 20px 7px 20px' };

                    const menu = ( rec ) => (
                        <Menu style={{ width: '100px' }}>
                            <Menu.Item>
                                <a style={ menuPadding } onClick = { this.showModal.bind(this, rec ) } >{_('Edit')}</a>
                            </Menu.Item>
                            <Menu.Item>
                                <a style={ menuPadding } onClick={ this.copyVar.bind(this, rec.mid ) }>{ _('Copy') }</a>
                            </Menu.Item>
                            <Menu.Item>
                                <a style={ menuPadding } onClick={ this.deleteVar.bind(this, rec.mid ) }>{ _('Delete') }</a>
                            </Menu.Item>
                        </Menu>
                    );

                    return (
                        <div ref={ (ref) => this.ref = ref }>
                            <Popconfirm visible={ this.state.confirmDelete[rec.mid] }
                                placement="left"
                                title={ _('Delete Variable %1', rec.varname ) }
                                onConfirm={ this.deleteOk.bind(this, rec.mid) }
                                onCancel={ () => this.setState({ confirmDelete: { [rec.mid]: false } }) }
                                okText={ _('Yes') }
                                cancelText={ _('No') }
                            >
                                <Dropdown
                                    placement="bottomCenter"
                                    overlay = { menu( rec ) }
                                >
                                    <span className = "ant-dropdown-link" >
                                        <img style={{ cursor: 'pointer' }} src = { IC('dots-horiz') } />
                                    </span>
                                </Dropdown>
                            </Popconfirm>
                        </div>
                    );
                }
            }
        ];

        return (
            <div style={{ ...relativeCss }}>
                <div style={{padding: '20px 7px 15px 7px', border: 0 }}>
                    <Search
                        placeholder={ _("search") }
                        className="clad-search"
                        onPressEnter={ (e) => this.searcher( e.target.value ) }
                        onSearch={ this.searcher.bind( this ) }
                    />
                    <Button type="primary" ghost={ true }
                        style={{ float: 'right' }}
                        onClick={ this.showModal.bind(this, { vartype: 'plain' } ) }
                    >
                        { _('Create') }
                    </Button>
                </div>
                <div style={{ overflow: 'auto', height: '100%', paddingRight: '24px' }}>
                    <Table
                        columns={columns}
                        className="clad-table-header"
                        showHeader={ 1 }
                        style={{ 'padding-bottom': '70px' }}
                        rowKey={record => record.mid}
                        dataSource={this.state.data}
                        pagination={this.state.pagination}
                        loading={this.state.loading}
                        onChange={this.handleTableChange.bind(this)}
                    />

                    <VarForm
                        modalVisible={ this.state.modalVisible }
                        ref={ form => this.form = form }
                        onOk={ this.handleOk.bind(this) }
                        onCancel={ this.handleCancel.bind(this) }
                        record={ this.state.record }
                        allEnvs={ this.state.allEnvs }
                        allProjects={ this.state.allProjects }
                    />
                </div>
            </div>
        )
    }
}

function build( idDom, params ){
    ReactDOM.render(
        <LocaleProvider locale={ Prefs.language == 'en' ? enUS : esES }>
            <VarAdmin extPanel = { params.extPanel } />
        </LocaleProvider>,
        idDom
    );
};

export { build };
