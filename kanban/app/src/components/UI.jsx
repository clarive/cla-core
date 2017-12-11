import React from 'react';
import store from 'stores/StaticStore';
import { Spin } from 'antd';
import { observer, inject } from 'mobx-react';
import PropTypes from 'prop-types';

const CategoryLabel = (props) => {
    const card = props.card;
    return <span id="boot" className="left">
        <span className={ 'label category-label category-' + card.id_category }>
            { store.categoryById[card.id_category] ?
                store.categoryById[card.id_category].acronym :
                ''
            } { ' #' + card.mid }
        </span>
    </span>
}


const LoadingMask = inject("ViewStore")( ({ ViewStore, containerClass }) => {
    const containerNode = $(ViewStore.node).find(`.${containerClass}`);
    const top = containerNode.scrollTop() || 0;
    const left = containerNode.scrollLeft() || 0;

    return <div style={{
        position: 'absolute',
        top: top,
        left: left,
        width: '100%',
        height: '100%',
        background: '#eee',
        opacity: 0.7
    }}>
        <Spin className="center" size="large" />
    </div>
})

LoadingMask.propTypes = {
    containerClass: PropTypes.string.isRequired
};

export { CategoryLabel, LoadingMask };
