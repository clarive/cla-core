import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable } from 'mobx';

import { Button, Modal, Form, Input, Radio } from 'antd';
const FormItem = Form.Item;

import api from 'lib/api';
import Kanban from 'components/Kanban.jsx';

const CollectionCreateForm = observer(Form.create()( (props) => {

    const { visible, onCancel, onCreate, form } = props;
    const { getFieldDecorator } = form;

    return (
        <Modal
            visible={props.show}
            title={ _("Create New Kanban Board") }
            onCancel={onCancel}
            onOk={onCreate}
            okText={ _('Create') }
            cancelText={ _('Cancel') }
        >
            <Form layout="vertical">

                <FormItem label={ _("Board Name") }>
                    {   getFieldDecorator('name', {
                        rules: [{ required: true, message: _("Board Name Required") }],
                    })( <Input /> )}
                </FormItem>

                <FormItem label={ _("Board Type") }>
                    {   getFieldDecorator('type', {
                        initialValue: 'dynamic',
                    })(
                        <Radio.Group>
                            <Radio value="dynamic">{ _("Dynamic") }</Radio>
                            <Radio value="static">{ _("Static") }</Radio>
                        </Radio.Group>
                    )}
                </FormItem>
            </Form>
        </Modal>
    );
}));

@inject("ViewStore")
@inject("DataStore")
@inject("ClaStore")
@observer class CollectionsPage extends React.Component {

    @observable show = true;

    handleCancel = (kanban) => {

        const { ClaStore, ViewStore } = this.props;

        if (!kanban.id) {
            if (ClaStore && ClaStore.onClose) {
                ClaStore.onClose();
            }
        } else {
            if (ClaStore && ClaStore.onCreate) {
                ViewStore.location = <Kanban id={kanban.id} />;
                ClaStore.onCreate(kanban);
            }
        }

        this.show = false;
        ViewStore.modal(null);
    }

    handleCreate = () => {
        const form = this.form;
        form.validateFields((err, values) => {
            if (err) return;
            api.post('board/create', values).done( (kanban) => {
                this.props.DataStore.boards.push(kanban);
                form.resetFields();
                this.handleCancel(kanban);
            });
        });
    }

    render() {
        return (
            <CollectionCreateForm
                show={ this.show }
                ref={ (node) => this.form = node }
                onCancel={this.handleCancel}
                onCreate={this.handleCreate}
            />
        );
    }
}

export default CollectionsPage;
