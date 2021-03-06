import Vue from 'vue'
import AV from 'leancloud-storage'
import 'normalize.css'

let APP_ID = '3gjqAs88lT1E12YBBzrMEXmk-gzGzoHsz';
let APP_KEY = 'hqYEwwHrpDBMCOd0AUeSGGPD';
AV.init({
    appId: APP_ID,
    appKey: APP_KEY
});

var app = new Vue({
    el: '#app',
    data: {
        newTodo: '',
        actionType: 'signup',
        todoList: [],
        formData: {
            username: '',
            password: '',
        },
        currentUser: null,
        currentTime:null
    },
    created: function () {
        this.currentUser = this.getCurrentUser()

        this.fetchTodos() // 将原来的一坨代码取一个名字叫做 fetchTodos
    },
    methods: {
        format:function(date){
            var y = date.getFullYear();  
            var m = date.getMonth() + 1;  
            m = m < 10 ? ('0' + m) : m;  
            var d = date.getDate();  
            d = d < 10 ? ('0' + d) : d;  
            var h = date.getHours();  
            var minute = date.getMinutes();  
            minute = minute < 10 ? ('0' + minute) : minute;  
            return y + '-' + m + '-' + d +' '+h+':'+minute; 
        },
        getCurrentUser: function () {
            let current = AV.User.current()
            // 一开始就要检查用户是否登录
            if (current) {
                // attributes 就是我们传给数据库的 username
                // createdAt 是这个数据创建的时间，id 是用户的 id
                let {id,createdAt,attributes: {username}} = current
                this.formData.username = current.attributes.username
                this.currentTime = this.format(current.createdAt)
                return {
                    id,
                    username,
                    createdAt
                }
            } else {
                return null
            }
        },
        signup: function () {
            // 将username、id、createdAt传给服务器存储到服务器
            // 密码会自动传过去，前端看不到
            let user = new AV.User()
            user.setUsername(this.formData.username)
            user.setPassword(this.formData.password)
            user.signUp().then((loginedUser) => {
                this.currentUser = this.getCurrentUser()
            }, (error) => {
                console.log('注册失败')
            });
        },
        //同时满足username、password就登陆   
        login: function () {
            AV.User.logIn(this.formData.username, this.formData.password).then((loginedUser) => {
                this.currentUser = this.getCurrentUser()
                this.fetchTodos() // 登录成功后读取 todos
            }, function (error) {
                console.log('登录失败')
            });
        },
        //登出   
        logout: function () {
            AV.User.logOut()
            this.currentUser = null
            window.location.reload()
        },

        addTodo: function () {
            this.todoList.push({
                title: this.newTodo,
                createdAt: new Date(),
                done: false
            })
            this.newTodo = ''
            this.saveOrUpdateTodos() // 不能用 saveTodos 了
        },
        removeTodo: function (todo) {
            let index = this.todoList.indexOf(todo)
            this.todoList.splice(index, 1)
            this.updateTodos()
        },
        //在每次用户新增、删除 todo 的时候，就发送一个请求   
        saveTodos: function () {
            let dataString = JSON.stringify(this.todoList)
            var AVTodos = AV.Object.extend('AllTodos')
            var avTodos = new AVTodos()
            //Access Control List   
            var acl = new AV.ACL()
            acl.setReadAccess(AV.User.current(), true) // 只有这个 user 能读
            acl.setWriteAccess(AV.User.current(), true); // 只有这个 user 能写

            avTodos.set('content', dataString)
            avTodos.setACL(acl) // 设置访问控制
            avTodos.save().then((todo) => {
                this.todoList.id = todo.id // 一定要记得把 id 挂到 this.todoList 上，否则下次就不会调用 updateTodos 了
                console.log('保存成功')
            }, function (error) {
                console.log('保存失败')
            })
        },
        //更新todo   
        updateTodos: function () {
            let dataString = JSON.stringify(this.todoList)
            let avTodos = AV.Object.createWithoutData('AllTodos', this.todoList.id)
            avTodos.set('content', dataString)
            avTodos.save().then(() => {
                console.log('更新成功')
            })
        },
        saveOrUpdateTodos: function () {
            if (this.todoList.id) {
                this.updateTodos()
            } else {
                this.saveTodos()
            }
        },

        fetchTodos: function () {
            if (this.currentUser) {
                var query = new AV.Query('AllTodos');
                query.find().then((todos) => {
                    let avAllTodos = todos[0] // 因为理论上 AllTodos 只有一个，所以我们取结果的第一项
                    let id = avAllTodos.id
                    this.todoList = JSON.parse(avAllTodos.attributes.content) // 为什么有个 attributes？因为我从控制台看到
                    this.todoList.id = id 
                }).then(function (error) {
                    console.log(error)
                });
            }
        }
    }
})