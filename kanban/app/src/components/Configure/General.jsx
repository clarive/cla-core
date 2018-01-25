import React from 'react';
import { observer, inject } from 'mobx-react';
import { Input, Form } from 'antd';
const FormItem = Form.Item;

import { isEmpty } from "lib/utils.js";
import { SelectUsers, SelectGroups } from 'components/FormItems/Select.jsx'

@inject("localStore")
@observer class General extends React.Component {
    constructor(props) {
        super(props);
    }

    handleChange (type, value) {
        this.props.localStore[type] = value;
    }

    updateName (e) {
        const { localStore } = this.props;
        localStore.name = e.target.value;
        localStore.setFieldError( this, isEmpty( localStore.name ) );
    }

    render() {

        const { localStore } = this.props;
        const selectedUsers = localStore.users.toJS();
        const selectedGroups = localStore.groups.toJS();

        const validateProps = {
            validateStatus : isEmpty(localStore.name) ? 'error' : undefined,
            help: isEmpty(localStore.name) ? _("Board name is required") : undefined
        }

        return (
            <div>
                <Form layout="vertical">
                    <FormItem
                        {...validateProps}
                        label={ _("Board Name") }
                    >
                        <Input
                            onChange={ (e) => this.updateName(e) }
                            value={ localStore.name }
                            style={{width: '100%'}} />
                    </FormItem>

                    <FormItem label={ _("Share With Users") }>
                        <SelectUsers
                            valueField="username"
                            defaultValue={selectedUsers}
                            onChange={ (v) => this.handleChange('users', v) }
                        />
                    </FormItem>

                    <FormItem label={ _("Share With Groups") }>
                        <SelectGroups
                            value={selectedGroups}
                            onChange={ (v) => this.handleChange('groups', v) }
                        />
                    </FormItem>
                </Form>
            </div>
        )
    }
}

export default General;
