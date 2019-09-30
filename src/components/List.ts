import '../css/list.scss'
import Comment from './Comment'
import ArtalkContext from '../ArtalkContext'
import Utils from '../utils'

export default class List extends ArtalkContext {
  public el: HTMLElement

  public commentsWrapEl: HTMLElement

  public comments: Comment[] = []

  constructor () {
    super()

    this.el = Utils.createElement(require('../templates/List.ejs')(this))
    this.artalk.el.appendChild(this.el)

    this.commentsWrapEl = this.el.querySelector('.artalk-list-comments-wrap')
    this.loadComments()

    this.el.querySelector('[data-action="open-sidebar"]').addEventListener('click', () => {
      this.artalk.sidebar.show()
    })
  }

  loadComments () {
    this.artalk.request('CommentGet', {
      page_key: this.artalk.conf.pageKey
    }, () => {
      this.artalk.ui.showLoading()
    }, () => {
      this.artalk.ui.hideLoading()
    }, (msg, data) => {
      this.artalk.ui.setGlobalError(null)
      this.putCommentsByObj(data.comments)
    }, (msg, data) => {
      const errEl = Utils.createElement(`<span>${msg}，无法获取评论列表数据<br/></span>`)
      const retryBtn = Utils.createElement('<span style="cursor:pointer">点击重新获取</span>')
      retryBtn.addEventListener('click', () => {
        this.loadComments()
      })
      errEl.appendChild(retryBtn)
      this.artalk.ui.setGlobalError(errEl)
    })
  }

  putCommentsByObj (rawData: any[]) {
    if (!Array.isArray(rawData)) { throw new Error('putCommentsByObj 出错：参数非数组') }

    const comments: Comment[] = []
    rawData.forEach((commentData) => {
      if (commentData.id === 0) {
        throw new Error('黑人问号 ??? Comment 的 ID 怎么可能是 0 ?')
      }
      if (commentData.rid === 0) {
        comments.push(new Comment(this, commentData))
      }
    })

    // 是否存在子评论
    const isChildExistByParentId = (parentId: number) => {
      return rawData.find(o => o.rid === parentId) !== null
    }

    // 查找并导入所有子评论
    const queryChildren = (parentComment: Comment) => {
      rawData.forEach((commentData) => {
        if (commentData.rid === parentComment.data.id) {
          const cComment = new Comment(this, commentData)
          parentComment.setChild(cComment)

          // 递归查找子评论的子评论
          if (isChildExistByParentId(cComment.data.id)) {
            queryChildren(cComment)
          }
        }
      })
    }

    // 导入子评论
    comments.forEach((comment) => {
      queryChildren(comment)
    })

    this.comments = comments

    // 装载评论元素
    this.comments.forEach((comment) => {
      this.commentsWrapEl.appendChild(comment.getElem())
    })

    this.updateIndicator()
  }

  putComment (comment: Comment) {
    this.commentsWrapEl.prepend(comment.getElem())
    this.comments.unshift(comment)
    this.updateIndicator()
  }

  /**
   * 更新指示器
   */
  updateIndicator () {
    (this.el.querySelector('.artalk-comment-count-num') as HTMLElement).innerText = this.comments.length.toString()

    let noCommentElem = this.commentsWrapEl.querySelector('.artalk-no-comment') as HTMLElement
    if (this.comments.length <= 0 && !noCommentElem) {
      noCommentElem = Utils.createElement('<div class="artalk-no-comment"></div>')
      noCommentElem.innerText = this.artalk.conf.noComment
      this.commentsWrapEl.appendChild(noCommentElem)
    }
    if (this.comments.length > 0 && noCommentElem !== null) {
        noCommentElem.remove()
    }
  }
}