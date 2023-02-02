import { PureComponent } from 'react';
import { AliveScope } from 'react-activation'
import { connect } from 'dva';
import router from 'umi/router';
import { ContainerQuery } from 'react-container-query';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Media from 'react-media';

import { Layout, BackTop, Icon } from 'antd';
import { Exception, BaseIcon } from '@/components';
import Menus from '../components/Menus';
import Authorized from '../components/Authorized';
import GlobalPageHeader from '../components/GlobalPageHeader';
import PageHeader from '../components/PageHeader';
import Logo from '../components/Logo'

import Context from '../Context';
import { query } from '../constant';
import { sysDefultPage } from '@/config/platform.config'
import styles from './index.less';

const { Header, Sider, Content } = Layout;
/**
 * 获取菜单默认key
 * @param {*} pathname 
 */
const _getKey = (pathname) => {
    if (typeof pathname === 'string' && pathname !== '') {
        const arr = pathname.split('').reverse();
        const index = arr.indexOf('/');
        if (index > -1) {
            return arr.slice(0, index).reverse().join('');
        }
    }
    return pathname;
};
/**
 * 权限页，当没有权限时跳转403页面
 */
const Exception404 = <Exception
    type={404}
    backText={'返回首页'}
    title={'404'}
    desc={'抱歉，你访问的页面已丢失'}
/>;

class Platform extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            // 侧边栏状态
            collapsed: false,
            // 目前已经设置了系统主题，以下两个属性可以忽略
            // 系统主题
            theme: 'light',
            // 菜单主题
            menuTheme: 'dark',
            
        };
    };
    componentDidMount() {
        const { dispatch, isMobile } = this.props;
        const { collapsed } = this.state;
        
        if (isMobile !== collapsed) {
            this.setState({ collapsed: isMobile });
        }

        // 获取菜单列表
        dispatch({
            type: 'menu/getMenuData',
        })
    }

    // componentWillReceiveProps 改为componentDidUpdate后逻辑需要修改
    UNSAFE_componentWillReceiveProps(nextProps) {
        
        const { isMobile } = nextProps;
        // 如果是手机端设置侧边栏状态默认收缩
        if (isMobile !== this.props.isMobile && isMobile !== this.state.collapsed) {
            this.setState({ collapsed: isMobile });
        }
    }

    /**
     * 设置侧边栏状态
     */
    toggle = () => {
        this.setState({
            collapsed: !this.state.collapsed,
        });
    }
    /**
     * 通过context将location,theme,screen广播给所有子组件
     * @param {*} screen 屏幕尺寸
     */
    getContext(screen) {
        const { location } = this.props;
        const { theme } = this.state;
        return {
            location,
            theme,
            screen
        };
    }
    render() {
        // 侧边栏状态
        const { collapsed } = this.state;
        const { activeTabRoute, menusData } = this.props;
        const { pathname, state: pathstate } = activeTabRoute;
        // // 获取breadcrumb数据
        // const [menu = {}] = flattenMenuData.filter(item => item.link === pathname);
        // const { pathtitles = [] } = menu;
        // const breadcrumbData = pathtitles;
        // this.setState({
        //     breadcrumbData: [...breadcrumbData]
        // });
        const triggerIcon = (
            <div style={{ width: 50 }}>
                <Icon
                    className={styles.trigger}
                    type={collapsed ? 'menu-unfold' : 'menu-fold'}
                    onClick={this.toggle}
                />
            </div>
        )

        const { key } = pathstate || {};
        // 菜单默认key
        const defaultKey = key || _getKey(pathname);
        return (
            /**
             * 媒体查询 响应式组件
             * @param {object} query 窗口名称：screen-xs | screen-sm | screen-md | screen-lg ……
             */
            <ContainerQuery query={query}>
                {params => (
                    // react上下文
                    <Context.Provider value={this.getContext(params)}>
                        {/* layout布局 */}
                        <Layout className={classNames(styles.wrap, params)}>
                            {/* 侧边栏 */}
                            <Sider
                                width={280}
                                trigger={null}
                                collapsible
                                collapsed={collapsed}
                                className={styles.sider}
                            >
                                {/* LOGO */}
                                <Logo collapsed={collapsed} />
                                {/* 菜单栏 */}
                                <Menus
                                    activeTabRoute={activeTabRoute}
                                    menusData={menusData}
                                    defaultKey={defaultKey}
                                    collapsed={collapsed}
                                />
                            </Sider>
                            {/* 系统主体部分 */}
                            <Layout  className={styles.container} style={{ marginLeft: collapsed ? 80 : 280 }}>
                                {/* 系统头部 */}
                                <Header className={styles.contentHeader}>
                                    {/* 包含面包屑 */}
                                    <GlobalPageHeader {...this.props}>
                                        {/* 菜单切换和用户信息 */}
                                        <PageHeader {...this.props} prefix={triggerIcon}>
                                            <BaseIcon className={styles.switchIcon} style={{ fontSize: '32px' }} type="screen" onClick={() => router.replace(sysDefultPage)}/>
                                        </PageHeader>
                                    </GlobalPageHeader>
                                </Header>
                                {/* 内容区域 */}
                                <Content id="backTop" className={`${styles.content} scrollbar`} >
                                    {/* 路由权限校验 */}
                                    {/* AliveScope 缓存入口 */}
                                    <AliveScope>
                                        {/* 窗口 */}
                                        <Authorized noMatch={Exception404} {...this.props} />
                                    </AliveScope>
                                </Content>
                            </Layout>
                            {/* 返回顶端 */}
                            <BackTop target={() => document.getElementById('backTop')} style={{ right: 30, bottom: 25 }} />
                        </Layout>
                    </Context.Provider>
                )}
            </ContainerQuery>
        );
    }
}

/**
 * 
 * @param {dva model name} 
 * @returns { dva model state }
 * @description 需先引入connect根据语法糖建立连接。将对应model中的state合并传入组建中
 */

function mapStateToProps({ global, menu, loading }) {
    return {
        ...global,
        ...menu,
        loading: loading.global
    };
}
export default connect(mapStateToProps)(props =>
    // 媒体查询 小于1200px 判断为mobile
    <Media query="(max-width: 1200px)">
        {isMobile => <Platform {...props} isMobile={isMobile} />}
    </Media>
);
//属性校验 出错定位
Platform.propTypes = {
    children: PropTypes.element.isRequired,
    //用户信息
    userInfo: PropTypes.object,
    //菜单数据
    menusData: PropTypes.arrayOf(PropTypes.object),
    //有路由权限菜单一维数组
    flattenMenuData: PropTypes.arrayOf(PropTypes.object),
};