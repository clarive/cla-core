import React from 'react';
import { observer, inject } from 'mobx-react';
import { Input, Form } from 'antd';
const FormItem = Form.Item;

import { SelectUsers } from 'components/FormItems/Select.jsx'

@inject("localStore")
@observer class General extends React.Component {
    constructor(props) {
        super(props);
    }

    handleChange (type, value) {
        this.props.localStore[type] = value;
    }

    updateName (e) {
        this.props.localStore.name = e.target.value;
    }

    render() {

        const { localStore } = this.props;
        const selectedUsers = localStore.users.toJS();

        return (
            <div>
                <Form layout="vertical">
                    <FormItem label={ _("Board Name") }>
                        <Input
                            onBlur={ (e) => this.updateName(e) }
                            defaultValue={ localStore.name }
                            style={{width: '100%'}} />
                    </FormItem>

                    <FormItem label={ _("Share With") }>
                        <SelectUsers
                            valueField="username"
                            defaultValue={selectedUsers}
                            onChange={ (v) => this.handleChange('users', v) }
                        />
                    </FormItem>
                </Form>
            </div>
        )
    }
}

export default General;
