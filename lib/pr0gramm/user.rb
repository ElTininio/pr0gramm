class Pr0gramm

  class User

    attr_reader :id, :name, :registered, :score, :mark, :admin, :banned,
                :comment_count, :upload_count, :like_count, :tag_count,
                :follow_count, :likes_are_public, :following

    def initialize(user_data)

      # http://pr0gramm.com/api/profile/info?name=GermanLeviathan

      @id         = user_data['user']['id']
      @name       = user_data['user']['name']
      @registered = Time.at( user_data['user']['registered'].to_i ).to_datetime
      @score      = user_data['user']['score']
      @mark       = Pr0gramm::Mark.string( user_data['user']['mark'] )
      @admin      = user_data['user']['admin'] == 1 ? true : false
      @banned     = user_data['user']['banned'] == 1 ? true : false

      @comment_count    = user_data['commentCount']
      @upload_count     = user_data['uploadCount']
      @like_count       = user_data['likeCount']
      @tag_count        = user_data['tagCount']
      @follow_count     = user_data['followCount']
      @likes_are_public = user_data['likesArePublic']
      @following        = user_data['following']

      # TODO:
      # - comments
      # - uploads
      # - likes
      # - badges
      # - following
    end
  end

end
