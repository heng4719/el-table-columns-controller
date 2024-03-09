// 表格列宽自动记录
export default {

    data() {
        return {
            _colsDB: null,
            _colsTableName: "",
            _colWidths:[],
            _columns: null,
            OTableTotalWidth: 0 //这个变量非常奇怪，它无法改名为带有下划线前缀的其他名词，否则列宽会出错
        }
    },

    mounted(){
        //测试浏览器是否支持indexedDB
        let indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
        if(indexedDB) {
            //获得当前页面路由，作为表名
            this._colsTableName = this.$route.path
            //初始化数据库并开始处理表格列宽
            this._initIndexDB();
        }else{
            console.error("[列宽控制工具] 该浏览器不支持indexedDB，表格列宽记录工具无法生效");
        }
    },

    methods: {        
        // 表格宽度处理事件
        _headerDragend(newWidth, oldWidth, column, event){
            // console.log(`表格发生拖拽 ${column.label}: ${oldWidth} -> ${newWidth}`)
            //更新缓存记录
            this._colWidths.find(item=> item.label == column.label).width = newWidth
            //更新数据库记录
            let updateData = {
                label: column.label,
                width: newWidth
            }
            this._updateDB(updateData)                
            //重新设置列宽
            this._setTableWidth()
        },

        //清空当前页面数据库记录
        _clearTableWidthDB(){
            this.$confirm('确认重置当前表格列宽?', '提示', {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }).then(() => {                
			    let transaction = this._colsDB.transaction([this._colsTableName],'readwrite');
			    let store  = transaction.objectStore(this._colsTableName);
			    store.clear();
                this.$message({
                  type: 'success',
                  message: '重置成功!'
                });
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }).catch(() => {        
            });

        },

        //初始化数据库
        _initIndexDB(){
            let that = this
            const openOrCreateDB = window.indexedDB.open('colsWidthDB', 1);
            openOrCreateDB.addEventListener('error', () =>
              console.error('[列宽控制工具] 打开 IndexDB 失败')
            );
            openOrCreateDB.addEventListener('success', async (event) => {
              that._colsDB = event.target.result; //数据库对象
              //初始化数据库表
              await that._initDBTable()
              //处理列宽
              that._setTableWidth()
            });
            openOrCreateDB.addEventListener('upgradeneeded', (init) => {
              that._colsDB = init.target.result;
              that._colsDB.onerror = () => {
                console.error('[列宽控制工具] 数据库加载失败');
              };
              that._colsDB.createObjectStore(this._colsTableName, { keyPath: 'label' });
            });
        },

        //初始化数据库表
        _initDBTable(){
            return new Promise((resolve, reject)=>{
                // 获取表元素
                let tables = document.getElementsByClassName("el-table")
                if(!tables || tables.length == 0){ return }
                let table = tables[0].__vue__
                let columns = table.columns
                this._columns = table.columns
                this._colWidths = []
                columns.forEach(async (col, index) =>{
                    if(col.label){
                        //查询是否存在该名称的记录
                        let res = await this._getDataByLabel(this._colsDB, col.label)                        
                        if(!res){
                            //如果不存在该列的数据，则新增
                            let newCol = {
                                label: col.label,
                                width: col.realWidth || col.width
                            }
                            this._addData(newCol)
                            this._colWidths.push(newCol)
                        }else{
                            this._colWidths.push(res)
                        }
                    }
                    if(index == columns.length - 1){
                        resolve()
                    }
                })          
            })
        },

        //向数据库插入新纪录
        _addData(data) {
            var request = this._colsDB
                .transaction([this._colsTableName],"readwrite") // 事务对象 指定表格名称和操作模式 ("只读"或"读写")
                .objectStore(this._colsTableName) // 仓库对象
                .add(data);
            request.onsuccess = function (event){    
                // console.log("数据写入成功");
            };
            request.onerror = function (event) {
                console.error("[列宽控制工具] 数据写入失败");
            };
        },

        //更新数据库记录
        _updateDB(data) {
            var request = this._colsDB
                .transaction([this._colsTableName],"readwrite") // 事务对象
                .objectStore(this._colsTableName) // 仓库对象
                .put(data);

            request.onsuccess = function () {
                // console.log("数据更新成功");
            };

            request.onerror = function () {
                console.error("[列宽控制工具] 数据更新失败");
            };
        },

        //查询数据库 根据列名从数据库中获取对应列宽数据
        _getDataByLabel(db, key) {
            return new Promise((resolve, reject) => {
                let transaction = db.transaction([this._colsTableName]); // 事务
                let objectstore = transaction.objectStore(this._colsTableName); // 仓库对象
                let request = objectstore.get(key); // 通过主键获取数据
                request.onerror = function (event) {
                    console.error("[列宽控制工具] 数据库事务失败");
                };
                request.onsuccess = function (event) {
                    resolve(request.result);
                };
            });
        },

        //设置表格宽度
        _setTableWidth(){
            // 获取表元素
            let tables = document.getElementsByClassName("el-table")
            if(!tables || tables.length == 0){ return }
            let table = tables[0].__vue__
            let columns = table.columns
            if(this.OTableTotalWidth == 0){
                this.OTableTotalWidth = table.layout.bodyWidth
            }
            let lastColWidth = this.OTableTotalWidth
            for(let i = 0; i < columns.length; i++){
                let colWidths = this._colWidths.filter(item=>{
                    return item.label == columns[i].label
                })
                if(!colWidths || colWidths.length == 0) {
                    lastColWidth -= columns[i].width
                    continue 
                }
                let colData = colWidths[0]
                
                let cols = document.getElementsByName(columns[i].id);
                //最后一列需要自动计算出来，等于table的style.width - 其他col.width的总和
                if(i == columns.length-1){
                    cols.forEach(col => {
                        col.width = lastColWidth;
                    });
                    columns[i].width = lastColWidth;
                }else{
                    cols.forEach(col => {
                        col.width = `${colData.width}`;
                    });
                    columns[i].width = colData.width;
                    lastColWidth -= colData.width
                }
            }
            var gutter = document.getElementsByName("gutter");
            gutter.forEach(item => {
                item.style.width = '0';
            });
        }
    }

}