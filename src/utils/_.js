import _ from 'lodash';
import memoizeOne from 'memoize-one';
import isEqual from 'lodash/isEqual';
import { isURL } from './validate'
/**
 * more https://segmentfault.com/a/1190000022736837
 */
/**
 * 打散菜单树结构，转化为一维数组
 * @param {array||object} menuData
 * @param {array} routes
 * @param {array} pathtitles
 */
const _flattenMenu = (menuData = [], pathtitles = []) => {
    const rows = _.cloneDeep(Array.isArray(menuData) ? menuData : (menuData || {}).rows || []);
    let routes = [];
    for (const item of rows) {
        const { name, menuId, url, icon, list = [] } = item;
        if (list && list.length > 0) {
            routes = routes.concat(flattenMenu(list, pathtitles.concat({ name, icon, url })));
        } else if (url) {
            routes.push({
                ...item,
                key: menuId,
                pathname: isURL(url) ? '/iframe/' + menuId : url,
                state: {
                    key: url,
                    pathtitles: pathtitles.concat(name),
                    ...item
                }
            });
        }
    }
    return routes;
};
export const flattenMenu = memoizeOne(_flattenMenu, isEqual);

/**
 * 菜单权限,过滤没有权限的菜单，生成最终菜单和无权限菜单
 * @param {array||object} orginalData |全部菜单配置数据
 * @param {array||object} data |后端返回的菜单
 * @param {boolean}  menuPermission |是否加权限
 * @returns {object}
 */
const _munesFilter = (orginalData, menuPermission) => {
    if (orginalData === null || orginalData === undefined)
        return {};
    const menusData = _.cloneDeep(Array.isArray(orginalData) ? orginalData : orginalData.rows);
    // const option = _.cloneDeep(Array.isArray(data) ? data : data.rows);
    if (!menuPermission) {
        return {
            menusData,
            diffMenuData: [],
        };
    }
    // 降维操作
    const _dimensionalityReduction = (rows, names = []) => {
        rows.map(item => {
            const { menuId, list } = item;
            if (list && list.length > 0) {
                return _dimensionalityReduction(list, names);
            } else if (menuId) {
                return names.push(menuId);
            } else {
                console.warn('The key attribute requires a valid value to be accessible');
                return undefined;
            }
        });
        return names;
    };
    const flattenMenuData = flattenMenu(menusData);
    const keys = _dimensionalityReduction(menusData);
    // 菜单过滤 (***)
    const _filter = (menus, keys, pathtitles = []) => {
        const data = menus.map(item => {
            const { menuId, list, name, icon, url } = item;
            if (list && list.length > 0) {
                const res = _filter(list, keys);
                _.remove(res, value => value === undefined || value === null);
                item.list = res;
                return item;
            } else if (keys.indexOf(menuId) > -1) {
                return {
                    ...item,
                    pathtitles: pathtitles.concat({ name, icon, url }),
                };
            }
            return undefined;
        });
        _.remove(
            data,
            item =>
                item === undefined ||
                item === null ||
                (item.list && item.list.length === 0),
        );
        return data;
    };
    return {
        menusData: _filter(menusData, keys),
        diffMenuData: flattenMenuData.filter(item => !keys.includes(item.key)),
    };
};
export const munesFilter = memoizeOne(_munesFilter, isEqual);

const _searchMenu = (value, data, pathtitles = []) => {
    if (value === undefined || value === null) return {};
    data = _.cloneDeep(data);
    for (const item of data) {
        const { title, key, children } = item;
        if (children && children.length > 0) {
            return searchMenu(value, children, pathtitles.concat(title));
        } else if (key === value) {
            return { ...item, pathtitles: pathtitles.concat(title) };
        }
    }
};
export const searchMenu = memoizeOne(_searchMenu);

const _toTableData = (data = {}) => {
    const { columns = [], rows = [] } = data;
    const headData = columns.map(item => {
        const { name, field, ...rest } = item;
        return {
            title: name,
            dataIndex: field,
            key: field,
            ...rest,
        };
    });
    const dataSource = rows.map((item, i) => {
        return {
            key: i,
            ...item,
        };
    });
    return {
        columns: headData,
        dataSource,
    };
};
export const toTableData = memoizeOne(_toTableData, isEqual);

/**
 * 数字加逗号显示
 * @param {number} number
 * @param {number} limit
 * @returns {string} d
 */
const _formatNumer = (num, limit) => {
    if (num === undefined || num === null || num === '') return num;
    num += '';
    if (num === 'NaN') return num;
    limit = limit || 1000;
    const n = num.indexOf('.');
    let str = '';
    if (n > -1) {
        str = num.slice(n);
        num = num.slice(0, n);
    }
    const arr = num.split('');
    const len = arr.length;
    if (limit === 1000) {
        if (len >= 4) {
            arr.splice(-3, 0, ',');
        }
        if (len >= 7) {
            arr.splice(-7, 0, ',');
        }
        if (len >= 10) {
            arr.splice(-11, 0, ',');
        }
        if (len >= 13) {
            arr.splice(-15, 0, ',');
        }
    }
    num = arr.join('') + str;
    return num;
};
export const formatNumer = memoizeOne(_formatNumer);

/**
 * 提取indexs里的指标
 * @param data
 * @param indexs 要匹配的指标field数组
 * @param match 要模糊匹配的指标field数组
 */
const _tabledataFilter = (data = {}, indexs = [], match) => {
    const { columns, rows } = data;
    if (!(_.isArray(columns) && columns.length > 0 && _.isArray(rows) && rows.length > 0))
        return data;
    if (match && _.isArray(match) && match.length > 0) {
        indexs = columns
            .filter(o => {
                for (const v of match) {
                    if (o.field.indexOf(v) > -1) {
                        return true;
                    }
                }
                for (const v of indexs) {
                    if (o.field === v) {
                        return true;
                    }
                }
                return false;
            })
            .map(o => o.field);
    }
    const _getObj = (row = {}) => {
        const o = {};
        for (const v of indexs) {
            o[v] = row[v];
        }
        return o;
    };

    return {
        columns: columns.filter(item => indexs.includes(item.field)),
        rows: rows.map(row => _getObj(row)),
    };
};
export const tabledataFilter = memoizeOne(_tabledataFilter, isEqual);

/**
 * 删除数据中某个字段值
 * @param {*} data
 * @param {*} indexs
 */
const _tabledataDelete = (data = {}, indexs = []) => {
    const { columns, rows } = data;
    if (
        !(
            _.isArray(columns) &&
            columns.length > 0 &&
            _.isArray(rows) &&
            rows.length > 0 &&
            _.isArray(indexs) &&
            indexs.length > 0
        )
    )
        return data;
    const _indexs = columns
        .filter(item => {
            return !indexs.includes(item.field);
        })
        .map(item => item.field);
    return tabledataFilter(data, _indexs);
};
export const tabledataDelete = memoizeOne(_tabledataDelete, isEqual);

//sort排序
/**
 * 指定指标行排序
 * @param option
 * @param data 数据
 * @param sortname | ascending：升序 |descending：降序
 * @param field 指标名
 */
const _sortRows = option => {
    const { data, sortname = 'ascending', field } = option;
    if (data && typeof data === 'object' && field) {
        const { columns, rows } = data;
        if (columns && _.isArray(columns) && columns.length > 0) {
            if (rows && _.isArray(rows) && rows.length > 0) {
                const res = _.sortBy(rows, function(o) {
                    return o[field];
                });
                return {
                    columns,
                    rows: sortname === 'ascending' ? res : res.reverse(),
                };
            }
        }
    }
    return data;
};
export const sortRows = memoizeOne(_sortRows, isEqual);

/**
 * 获取当前系统时间戳 Y-m-d H:i:s
 */
function _getNowFormatTime() {
    var date = new Date();
    var seperator1 = '-';
    var seperator2 = ':';
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    if (month >= 1 && month <= 9) {
        month = '0' + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = '0' + strDate;
    }
    var currentdate =
        date.getFullYear() +
        seperator1 +
        month +
        seperator1 +
        strDate +
        ' ' +
        date.getHours() +
        seperator2 +
        date.getMinutes() +
        seperator2 +
        date.getSeconds();
    return currentdate;
}
export const getNowFormatTime = _getNowFormatTime;

/**
 * 扁平菜单树形化
 */

function _flattenMenuToTree(menuData, pid, temp = []) {
    const rows = _.cloneDeep(Array.isArray(menuData) ? menuData : menuData.rows);
    function arrayToTree(array, pid) {
        let result = [];
        array.forEach(item => {
            if (item.parentId === pid) {
                const children = arrayToTree(array, item.menuId);
                item.children = children.length >= 1 ? children : null;
                result.push(item);
            }
        });
        return result;
    }
    let treeArray = arrayToTree(rows, pid);
    return treeArray;
}

export const flattenMenuToTree = memoizeOne(_flattenMenuToTree, isEqual);

/**
 * 自动获取table滚动高度
 * @param {}
 * @returns
 */
export function getTableScroll(params) {
    let { extraHeight, id } = params || {};
    if (typeof extraHeight == 'undefined') {
        //  默认底部分页高度(分页暂时去除) + 边距10
        extraHeight = 10;
    }
    let tHeader = null;
    if (id) {
        tHeader = document.getElementById(id)
            ? document.getElementById(id).getElementsByClassName('ant-table-thead')[0]
            : null;
    } else {
        tHeader = document.getElementsByClassName('ant-table-thead')[0];
    }
    //表格内容距离顶部的距离
    let tHeaderBottom = 0;
    if (tHeader) {
        tHeaderBottom = tHeader.getBoundingClientRect().bottom;
    }
    //窗体高度-表格内容顶部的高度-表格内容底部的高度
    // let height = document.body.clientHeight - tHeaderBottom - extraHeight
    let height = `calc(100vh - ${tHeaderBottom + extraHeight}px)`;
    return height;
}
