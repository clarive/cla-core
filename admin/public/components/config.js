import React from 'react';
import ReactDOM, { render } from 'react-dom';
import { Menu, Tabs, Form, Input, Button } from 'antd';
import Api from '../lib/api.js';

const FormItem = Form.Item;
const TabPane = Tabs.TabPane;

function hasErrors(fieldsError) {
    return Object.keys(fieldsError).some(field => fieldsError[field]);
}

const relativeCss = {
    position: 'relative',
    height: '100%',
    paddingBottom : 70
}

class ConfigItem extends React.Component {
    render(){

        const { getFieldDecorator, getFieldError, isFieldTouched } = this.props.form;

        let self = this,
            items = this.props.items.map(function (item, i){
                const field = item.field_meta;
                const error = {};
                error[field.name] = isFieldTouched(field.name) && getFieldError(field.name);
                return (
                    <FormItem
                        key={'item-' + i}
                        label={field.label ? _(field.label) : _(item.config_label)}
                        validateStatus={error[field.name] ? 'error' : ''}
                        help={error[field.name] || ''}
                    >
                        {getFieldDecorator(field.name, {
                            initialValue: (item.value != undefined) ? item.value : '' ||
                                (item.config_default != undefined) ? item.config_default : '' || '',
                            rules: [{
                                required: field.require ? true : false, message: field.require_msg ? _(field.require_msg) : ''
                            }],
                        })(
                            <Input type={field.type ? field.type : ''}/>
                        )}
                    </FormItem>
                )
            })

        return (
            <div style={{ ...relativeCss, padding:'0px 30px 0 10px', overflow: 'auto' }}>
                {items}
            </div>
        )
    }
}

class ConfigGroup extends React.Component {
    render(){
        let self = this,
            allItems = [],
            groupsSort = Object.keys(this.props.groups).sort(),
            groups = groupsSort.map(function (group, i){
                self.props.groups[group].map(function (item, i){
                    allItems.push(item);
                });
                return (
                    <TabPane tab={_(group)} key={i+1}>
                        <ConfigItem items={self.props.groups[group]} form={self.props.form} />
                    </TabPane>
                )
            })

        return (
            <Tabs style={{ ...relativeCss }} tabPosition="left">
                <TabPane tab={_("All settings")} key={0}>
                    <ConfigItem items={allItems} form={self.props.form} />
                </TabPane>
                {groups}
            </Tabs>
        )
    }
}

class ConfigForm extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            groups: {},
            fieldKey: {}
        }
    }

    componentDidMount() {
        // To disabled submit button at the beginning.
        this.props.form.validateFields();

        Api.post('config/list', {
        }).done( (data) => {
            let groups = {},
                fieldKey = {};

            data.list.map(function (item){
                let field = item.field_meta;
                if (field.group) {
                    if (groups[field.group]) groups[field.group].push(item);
                    else {
                        groups[field.group] = [];
                        groups[field.group].push(item);
                    }
                    fieldKey[field.name] = item.key;
                }
            });
            this.setState({groups: groups, fieldKey: fieldKey});
        });

    }

    handleSubmit() {
        let self = this;
        this.props.form.validateFields((err, values) => {
            if (!err) {
                let fieldValues = values,
                    config = {};
                Object.keys(fieldValues).map(function (field){
                    config[self.state.fieldKey[field]] = fieldValues[field];
                })

                Api.postJSON('config/save', {
                    config: JSON.stringify(config)
                }).done( (data) => {
                    let msg;
                    if (data.result) msg = _('Config saved');
                    else msg = _('Error saving config')
                    Baseliner.message(_('Config List'), msg);
                });
            }
        });
    }

    render() {
        const { getFieldsError } = this.props.form;

        return (
            <div style={{ ...relativeCss }}>
                <Menu
                    mode="horizontal"
                    defaultSelectedKeys={[]}
                    style={{padding: '7px', border: 0, borderBottom: '1px solid #ccc' }}
                >
                    <Menu.Item key="save" style={{ float:'right', border: 0 }}>
                        <Button
                            icon="check"
                            type="primary"
                            disabled={hasErrors(getFieldsError())}
                            onClick={this.handleSubmit.bind(this)}
                        >
                            { _("Save") }
                        </Button>
                    </Menu.Item>
                </Menu>

                <div style={{ ...relativeCss, padding:'20px 0 20px 30px' }}>
                    <Form style={{ ...relativeCss }} layout="vertical">
                        <ConfigGroup groups={this.state.groups} form={this.props.form} />
                    </Form>
                </div>
            </div>
        );
    }
}

const WrappedConfigForm = Form.create()(ConfigForm);

function build(id){
    ReactDOM.render(
        <WrappedConfigForm />,
        id
    );
};

export { build };
