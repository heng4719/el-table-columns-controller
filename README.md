这是一个用于自动保存el-table列宽的小工具，采用mixins方式。
引入此包后，将提供两个方法：
1. 表头拖拽事件的回调方法：
    方法名：_headerDragend  
    说明：此方法提供了列宽自动保存的功能。  
    使用示例：  
    ```
        <el-table 
            border 
            @header-dragend="_headerDragend">
        </el-table>
    ```  
2. 表格列宽重置方法：  
    方法名：_clearTableWidthDB  
    说明：此方法将会清空当前页面保存的列宽数据，可用于重置当前列表宽度。请根据需要在合适的位置自行创建按钮调用该方法。