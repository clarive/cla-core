import React from 'react';
import { observer, inject } from 'mobx-react';
import { Alert } from 'antd';


import BasicFilter from 'components/Filter/Basic.jsx';

@inject("localStore")
@inject("DataStore")
@observer class Filter extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { localStore, DataStore } = this.props;
        return (
            <div>
                { DataStore.isStaticBoard &&
                    <div style={{ paddingBottom: 20 }}>
                        <Alert
                            message= { _("Note") }
                            description={ _("In static boards, filters are used as the default filters of the plan mode, they will not affect cards showing in your board") }
                            type="info"
                            showIcon
                        />
                    </div>
                }
                <BasicFilter filter={localStore.filter} />
            </div>
        )
    }
}

export default Filter;
