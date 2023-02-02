import Redirect from 'umi/redirect';
import { connect } from 'dva';

function mapStateToProps({ menu }) {
    return {
        ...menu
    };
}

export default connect(mapStateToProps)(props => {
    const { flattenMenuData } = props
    // 默认跳转到扁平化菜单第一级
    return (
        <Redirect to={flattenMenuData[0] || {}} />
    )
})

