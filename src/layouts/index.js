import LoginLayout from './login';
import PlatformLayout from './platform';
import AnotherLayout from './another';
import { getToken } from "@/utils/auth";
import { sysDefultPage } from '@/config/platform.config'

function Index(props) {
    const { children, location } = props;
    const { pathname } = location;
    if (pathname === '/login' || /^\/login/.test(pathname) || !getToken()) {
        // 登录页面
        return <LoginLayout>{children}</LoginLayout>;
    } else if (pathname === sysDefultPage.pathname) {
        // 其他布局的页面
        return <AnotherLayout>{children}</AnotherLayout>
    }
    // 业务页面
    return <PlatformLayout {...props}>{children}</PlatformLayout>;
}

export default Index;
